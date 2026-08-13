// 댓글 조회/작성 — 공개 글 조회(lib/db/posts.ts)와 달리 unstable_cache로 감싸지 않는다.
// 댓글은 작성 즉시 보여야 하는데, 'posts' 캐시 태그에 얹으면 글을 수정할 때만 갱신되고
// 별도 태그를 파면 댓글마다 revalidateTag를 부르게 된다. 그냥 매번 읽는 편이 단순하다.
import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import { getDb } from './client'
import { type CommentRow, comments, posts, postTranslations } from './schema'

export interface PublicComment {
  id: string
  parentId: string | null
  authorType: 'user' | 'anonymous'
  authorName: string
  authorAvatarUrl: string | null
  authorUrl: string | null
  /** 익명 작성자의 아바타 시드 — 같은 브라우저면 같은 값이다 */
  anonAvatarSeed: string | null
  bodyHtml: string
  locale: string | null
  isOwner: boolean
  isDeleted: boolean
  createdAt: string
  editedAt: string | null
  /** 서버가 세션을 보고 계산한다 — 클라이언트가 뒤집어도 각 API가 다시 검사한다 */
  canDelete: boolean
  canEdit: boolean
  replies?: PublicComment[]
}

export interface CreateCommentInput {
  postId: string
  parentId: string | null
  authorType: 'user' | 'anonymous'
  provider: string | null
  providerUserId: string | null
  authorName: string
  authorAvatarUrl: string | null
  authorUrl: string | null
  anonAvatarSeed: string | null
  bodyMd: string
  bodyHtml: string
  locale: string | null
  isOwner: boolean
}

export async function getPostIdBySlug(slug: string): Promise<string | null> {
  const db = getDb()
  const rows = await db.select({ id: posts.id }).from(posts).where(eq(posts.slug, slug)).limit(1)
  return rows[0]?.id ?? null
}

export interface RowPermission {
  canDelete: boolean
  canEdit: boolean
}

export function toPublic(row: CommentRow, permission: RowPermission): PublicComment {
  const isDeleted = row.status === 'deleted'
  const canEdit = permission.canEdit && !isDeleted
  return {
    id: row.id,
    parentId: row.parentId,
    authorType: row.authorType,
    // 삭제된 댓글은 저장 시점에 이미 비워두지만, 읽기에서도 한 번 더 막는다
    authorName: isDeleted ? '' : row.authorName,
    authorAvatarUrl: isDeleted ? null : row.authorAvatarUrl,
    authorUrl: isDeleted ? null : row.authorUrl,
    anonAvatarSeed: isDeleted ? null : row.anonAvatarSeed,
    bodyHtml: isDeleted ? '' : row.bodyHtml,
    locale: row.locale,
    isOwner: !isDeleted && row.isOwner,
    isDeleted,
    createdAt: row.createdAt.toISOString(),
    editedAt: isDeleted ? null : (row.editedAt?.toISOString() ?? null),
    canDelete: permission.canDelete && !isDeleted,
    canEdit,
  }
}

/**
 * 글 하나의 공개 댓글 트리. ko/en이 같은 스레드를 공유하므로 language 인자를 받지 않는다.
 * `permissionFor`는 세션을 아는 호출자가 넘긴다 (DB 계층이 쿠키를 읽지 않게 한다).
 */
export async function listCommentsByPostId(
  postId: string,
  permissionFor: (row: CommentRow) => RowPermission
): Promise<PublicComment[]> {
  const db = getDb()
  const rows = await db
    .select()
    .from(comments)
    .where(and(eq(comments.postId, postId), inArray(comments.status, ['visible', 'deleted'])))
    .orderBy(asc(comments.createdAt))

  const roots: PublicComment[] = []
  const byId = new Map<string, PublicComment>()

  for (const row of rows) {
    byId.set(row.id, toPublic(row, permissionFor(row)))
  }

  for (const row of rows) {
    const node = byId.get(row.id)
    if (!node) continue
    const parent = row.parentId ? byId.get(row.parentId) : null
    if (parent) {
      parent.replies = parent.replies ?? []
      parent.replies.push(node)
    } else {
      roots.push(node)
    }
  }

  // 답글이 남아있지 않은 삭제 댓글은 자리를 차지할 이유가 없다 — 스레드가 끊길 때만 비석을 남긴다
  return roots.filter((node) => !node.isDeleted || (node.replies?.length ?? 0) > 0)
}

export async function createComment(input: CreateCommentInput): Promise<CommentRow> {
  const db = getDb()
  const [row] = await db.insert(comments).values(input).returning()
  return row
}

export async function getCommentById(id: string): Promise<CommentRow | null> {
  const db = getDb()
  const rows = await db.select().from(comments).where(eq(comments.id, id)).limit(1)
  return rows[0] ?? null
}

/**
 * soft delete — 행은 남기되 본문과 작성자 정보를 지운다.
 * status만 바꾸고 본문을 남기면 어딘가의 응답에 실려 나갈 수 있다.
 */
export async function softDeleteComment(id: string): Promise<void> {
  const db = getDb()
  await db
    .update(comments)
    .set({
      status: 'deleted',
      bodyMd: '',
      bodyHtml: '',
      authorName: '',
      authorAvatarUrl: null,
      authorUrl: null,
      anonAvatarSeed: null,
      provider: null,
      providerUserId: null,
      notifyEmail: null,
      notifyToken: null,
      updatedAt: new Date(),
      editedAt: null,
    })
    .where(eq(comments.id, id))
}

/** 본문 수정. 작성자 정보는 건드리지 않는다 — 이름이 바뀌면 그건 수정이 아니라 다른 사람이다 */
export async function updateCommentBody(
  id: string,
  bodyMd: string,
  bodyHtml: string
): Promise<CommentRow | null> {
  const db = getDb()
  const now = new Date()
  const [row] = await db
    .update(comments)
    .set({ bodyMd, bodyHtml, updatedAt: now, editedAt: now })
    .where(eq(comments.id, id))
    .returning()
  return row ?? null
}

/** 관리자 모더레이션 — 숨김/복구 (본문은 보존해서 되돌릴 수 있게 한다) */
export async function setCommentStatus(id: string, status: 'visible' | 'hidden'): Promise<void> {
  const db = getDb()
  await db.update(comments).set({ status, updatedAt: new Date() }).where(eq(comments.id, id))
}

export interface AdminComment extends CommentRow {
  postSlug: string
  postTitle: string
}

/** 관리자 목록 — 최신순, 글 제목을 함께 준다 */
export async function listCommentsForAdmin(limit = 200): Promise<AdminComment[]> {
  const db = getDb()
  const rows = await db
    .select({ comment: comments, slug: posts.slug })
    .from(comments)
    .innerJoin(posts, eq(comments.postId, posts.id))
    .orderBy(desc(comments.createdAt))
    .limit(limit)

  if (rows.length === 0) return []

  // 제목은 한국어를 우선하고 없으면 아무 언어나 쓴다 — 관리 화면에서 글을 식별하는 용도다
  const postIds = [...new Set(rows.map((r) => r.comment.postId))]
  const titles = await db
    .select({
      postId: postTranslations.postId,
      language: postTranslations.language,
      title: postTranslations.title,
    })
    .from(postTranslations)
    .where(inArray(postTranslations.postId, postIds))

  const titleByPost = new Map<string, string>()
  for (const t of titles) {
    if (!t.title.trim()) continue
    if (t.language === 'ko' || !titleByPost.has(t.postId)) {
      titleByPost.set(t.postId, t.title)
    }
  }

  return rows.map((r) => ({
    ...r.comment,
    postSlug: r.slug,
    postTitle: titleByPost.get(r.comment.postId) ?? r.slug,
  }))
}
