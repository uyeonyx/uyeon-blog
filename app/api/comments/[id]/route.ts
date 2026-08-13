// 댓글 하나에 대한 작성자 동작 — 원문 조회(GET), 수정(PATCH), 삭제(DELETE).
// 권한 규칙은 lib/comments/permission.ts 한 곳에 있고 세 핸들러가 같은 것을 쓴다.
// 익명 판정은 anon_id 쿠키로 이뤄지므로 클라이언트가 실어 보낼 것이 없다.
import type { NextRequest } from 'next/server'
import {
  ANONYMOUS_MAX_LINKS,
  COMMENT_MAX_LENGTH,
  isBlankBody,
  renderCommentMarkdown,
} from '@/lib/comments/markdown'
import { canDeleteComment, canEditComment, loadCommentActor } from '@/lib/comments/permission'
import { getCommentById, softDeleteComment, updateCommentBody } from '@/lib/db/comments'
import { checkRateLimit } from '@/lib/mcp/rate-limit'

export const dynamic = 'force-dynamic'

function fail(code: string, status: number, headers?: HeadersInit) {
  return Response.json({ code, error: code }, { status, headers })
}

/** 세 핸들러가 공통으로 하는 일 — 댓글을 찾고 요청자의 권한을 계산한다 */
async function resolve(id: string) {
  const comment = await getCommentById(id)
  if (!comment || comment.status === 'deleted') return null

  const actor = await loadCommentActor()
  return {
    comment,
    canEdit: canEditComment(comment, actor),
    canDelete: canDeleteComment(comment, actor),
  }
}

/** 편집 폼을 채울 마크다운 원문. 목록 응답에 원문을 실어 모두에게 보내지 않기 위한 별도 조회다 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const resolved = await resolve(id)
  if (!resolved) return fail('not_found', 404)
  if (!resolved.canEdit) return fail('forbidden', 403)

  return Response.json({ bodyMd: resolved.comment.bodyMd })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const resolved = await resolve(id)
  if (!resolved) return fail('not_found', 404)
  if (!resolved.canEdit) return fail('forbidden', 403)

  // 작성만큼 조이지는 않는다 — 이미 본인으로 판정된 사람이고, 오타 수정을 몇 번 하는 건 정상이다
  const limit = checkRateLimit(request, {
    scope: 'comment-edit',
    windowMs: 5 * 60_000,
    maxRequests: 20,
  })
  if (!limit.ok) {
    return fail('rate_limited', 429, { 'Retry-After': String(limit.retryAfterSeconds) })
  }

  const body = await request.json().catch(() => null)
  const markdown = typeof body?.body === 'string' ? body.body.trim() : ''

  if (isBlankBody(markdown)) return fail('empty', 400)
  if (markdown.length > COMMENT_MAX_LENGTH) return fail('too_long', 400)

  // 작성 때와 같은 파이프라인·같은 제한을 다시 태운다.
  // 링크 2개로 등록한 뒤 수정으로 10개를 심는 우회를 막는다.
  const { html, linkCount } = await renderCommentMarkdown(markdown)
  if (resolved.comment.authorType === 'anonymous' && linkCount > ANONYMOUS_MAX_LINKS) {
    return fail('too_many_links', 400)
  }
  if (!html.trim()) return fail('empty', 400)

  const row = await updateCommentBody(id, markdown, html)
  if (!row) return fail('not_found', 404)

  return Response.json({
    bodyHtml: row.bodyHtml,
    editedAt: row.editedAt?.toISOString() ?? null,
  })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const resolved = await resolve(id)
  if (!resolved) return fail('not_found', 404)
  if (!resolved.canDelete) return fail('forbidden', 403)

  await softDeleteComment(id)
  return Response.json({ ok: true })
}
