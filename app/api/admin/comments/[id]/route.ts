// 관리자 모더레이션 — 숨김/복구(PATCH)와 삭제(DELETE).
// proxy.ts가 /api/admin/*를 이미 막지만, 라우트에서도 세션을 다시 확인한다.
import { requireAdminApi } from '@/lib/admin/session'
import { getCommentById, setCommentStatus, softDeleteComment } from '@/lib/db/comments'

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminApi()
  if (session instanceof Response) return session

  const { id } = await params
  const body = await request.json().catch(() => null)
  const status = body?.status

  if (status !== 'visible' && status !== 'hidden') {
    return Response.json({ error: 'status must be visible or hidden' }, { status: 400 })
  }

  const comment = await getCommentById(id)
  if (!comment) {
    return Response.json({ error: 'Comment not found' }, { status: 404 })
  }
  // 삭제된 댓글은 본문이 이미 지워져 있어 되살릴 것이 없다
  if (comment.status === 'deleted') {
    return Response.json({ error: 'Comment is already deleted' }, { status: 409 })
  }

  await setCommentStatus(id, status)
  return Response.json({ ok: true, status })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminApi()
  if (session instanceof Response) return session

  const { id } = await params
  const comment = await getCommentById(id)
  if (!comment) {
    return Response.json({ error: 'Comment not found' }, { status: 404 })
  }

  await softDeleteComment(id)
  return Response.json({ ok: true })
}
