// 공개 댓글 API. 글 페이지는 정적으로 프리렌더되고, 댓글은 마운트 후 여기로 가져온다.
import type { NextRequest } from 'next/server'
import siteMetadata from '@/data/siteMetadata'
import { getUserSession, isOwnerSession } from '@/lib/auth/user-session'
import { getOrCreateAnonSeed } from '@/lib/comments/anon-identity'
import { verifyChallenge } from '@/lib/comments/challenge'
import {
  ANONYMOUS_MAX_LINKS,
  COMMENT_MAX_LENGTH,
  isBlankBody,
  renderCommentMarkdown,
} from '@/lib/comments/markdown'
import { notifyNewComment } from '@/lib/comments/notify'
import { canDeleteComment, canEditComment, loadCommentActor } from '@/lib/comments/permission'
import {
  createComment,
  getCommentById,
  getPostIdBySlug,
  listCommentsByPostId,
  toPublic,
} from '@/lib/db/comments'
import type { CommentRow } from '@/lib/db/schema'
import { isLocale } from '@/lib/i18n/config'
import { checkRateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const ANONYMOUS_NAME_MAX = 20

/**
 * 실패 사유는 코드로 돌려주고 문구는 클라이언트가 로케일에 맞춰 고른다.
 * 서버가 영어 문장을 그대로 내려보내면 한국어 화면에 영어 오류가 섞인다.
 */
function fail(code: string, status: number, headers?: HeadersInit) {
  return Response.json({ code, error: code }, { status, headers })
}

function anonymousAllowed(): boolean {
  return process.env.COMMENTS_ALLOW_ANONYMOUS !== 'false'
}

/** 주인 사칭 차단 — isOwner 배지 자체는 서버가 세션으로만 켜지만 이름 혼동은 따로 막는다 */
function impersonatesOwner(name: string): boolean {
  const candidates = [process.env.ADMIN_GITHUB_LOGIN, siteMetadata.author, 'uyeon']
    .filter((v): v is string => typeof v === 'string' && v.length > 0)
    .map((v) => v.toLowerCase().replace(/\s/g, ''))
  const normalized = name.toLowerCase().replace(/\s/g, '')
  return candidates.includes(normalized)
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')
  if (!slug) {
    return fail('slug_required', 400)
  }

  const postId = await getPostIdBySlug(slug)
  if (!postId) {
    return fail('post_not_found', 404)
  }

  const actor = await loadCommentActor()
  const session = actor.session
  // 익명 판정도 쿠키로 서버에서 끝난다 — 클라이언트가 보정할 것이 없다
  const permissionFor = (row: CommentRow) => ({
    canDelete: canDeleteComment(row, actor),
    canEdit: canEditComment(row, actor),
  })

  const items = await listCommentsByPostId(postId, permissionFor)
  return Response.json(
    {
      items,
      viewer: session
        ? { name: session.name, avatarUrl: session.avatarUrl ?? null, login: session.login }
        : null,
      anonymousAllowed: anonymousAllowed(),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return fail('invalid_body', 400)
  }

  // 사람 눈에 보이지 않는 필드다 — 채워져 있으면 폼 자동 입력 봇이다
  if (typeof body.website === 'string' && body.website.length > 0) {
    return fail('rejected', 400)
  }

  const session = await getUserSession()
  const isAnonymous = !session

  if (isAnonymous && !anonymousAllowed()) {
    return fail('login_required', 401)
  }

  // 익명은 IP 기준으로 더 좁게, 로그인 사용자는 계정 기준으로 센다
  const limit = isAnonymous
    ? checkRateLimit(request, { scope: 'comment-anon', windowMs: 5 * 60_000, maxRequests: 2 })
    : checkRateLimit(request, {
        scope: 'comment-user',
        windowMs: 5 * 60_000,
        maxRequests: 5,
        identity: `${session.provider}:${session.providerUserId}`,
      })
  if (!limit.ok) {
    return fail('rate_limited', 429, { 'Retry-After': String(limit.retryAfterSeconds) })
  }

  // 어떤 검사에 걸렸는지는 알려주지 않는다 — 우회를 도와주는 꼴이 된다
  const challenge = await verifyChallenge(body.challenge ?? {})
  if (!challenge.ok) {
    return fail('verification_failed', 400)
  }

  const markdown = typeof body.body === 'string' ? body.body.trim() : ''
  if (isBlankBody(markdown)) {
    return fail('empty', 400)
  }
  if (markdown.length > COMMENT_MAX_LENGTH) {
    return fail('too_long', 400)
  }

  const slug = typeof body.slug === 'string' ? body.slug : ''
  const postId = slug ? await getPostIdBySlug(slug) : null
  if (!postId) {
    return fail('post_not_found', 404)
  }

  // 답글은 1단까지만 — 부모가 이미 답글이면 그 부모에 붙인다
  let parentId: string | null = null
  if (typeof body.parentId === 'string' && body.parentId) {
    const parent = await getCommentById(body.parentId)
    if (!parent || parent.postId !== postId || parent.status !== 'visible') {
      return fail('parent_not_found', 400)
    }
    parentId = parent.parentId ?? parent.id
  }

  let authorName: string
  if (session) {
    authorName = session.name
  } else {
    authorName = typeof body.authorName === 'string' ? body.authorName.trim() : ''
    if (authorName.length === 0 || authorName.length > ANONYMOUS_NAME_MAX) {
      return fail('name_required', 400)
    }
    if (impersonatesOwner(authorName)) {
      return fail('name_reserved', 400)
    }
  }

  const { html, linkCount } = await renderCommentMarkdown(markdown)
  if (isAnonymous && linkCount > ANONYMOUS_MAX_LINKS) {
    return fail('too_many_links', 400)
  }
  if (!html.trim()) {
    return fail('empty', 400)
  }

  const locale = isLocale(body.locale) ? body.locale : null

  // 같은 브라우저를 이어 붙이는 시드 — 아바타와 이후의 수정·삭제 권한이 모두 여기에 걸린다.
  // 쿠키가 없으면 여기서 발급된다.
  const anonAvatarSeed = isAnonymous ? await getOrCreateAnonSeed() : null

  const row = await createComment({
    postId,
    parentId,
    authorType: session ? 'user' : 'anonymous',
    provider: session?.provider ?? null,
    providerUserId: session?.providerUserId ?? null,
    authorName,
    authorAvatarUrl: session?.avatarUrl ?? null,
    authorUrl: session?.profileUrl ?? null,
    anonAvatarSeed,
    bodyMd: markdown,
    bodyHtml: html,
    locale,
    isOwner: session ? isOwnerSession(session) : false,
  })

  // 알림 실패가 댓글 작성 실패로 이어지면 안 된다 — 기다리지 않되 원인은 로그로 남긴다
  notifyNewComment({ comment: row, postSlug: slug }).catch((error) => {
    console.error('[comments] 알림 전송 중 오류:', error)
  })

  // 방금 쓴 사람은 언제나 자기 댓글을 고치고 지울 수 있다
  return Response.json({ comment: toPublic(row, { canDelete: true, canEdit: true }) })
}
