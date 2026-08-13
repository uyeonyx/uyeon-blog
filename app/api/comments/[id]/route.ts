// 댓글 삭제 — 로그인 본인 / 익명의 15분 토큰 / 관리자, 세 경로만 허용한다.
import type { NextRequest } from 'next/server'
import { getAdminSession } from '@/lib/admin/session'
import { getUserSession } from '@/lib/auth/user-session'
import { verifyDeleteToken } from '@/lib/comments/delete-token'
import { getCommentById, softDeleteComment } from '@/lib/db/comments'

export const dynamic = 'force-dynamic'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const comment = await getCommentById(id)
  if (!comment || comment.status === 'deleted') {
    return Response.json({ error: 'Comment not found' }, { status: 404 })
  }

  const [session, adminSession] = await Promise.all([getUserSession(), getAdminSession()])

  let allowed = false
  if (adminSession) {
    allowed = true
  } else if (session && comment.authorType === 'user') {
    allowed =
      comment.provider === session.provider && comment.providerUserId === session.providerUserId
  } else if (comment.authorType === 'anonymous') {
    // 본문에 토큰이 실려 오지 않으면 헤더도 본다 (fetch에서 DELETE 바디는 다루기 번거롭다)
    const body = await request.json().catch(() => null)
    const token = body?.deleteToken ?? request.headers.get('x-delete-token')
    allowed = verifyDeleteToken(id, token)
  }

  if (!allowed) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  await softDeleteComment(id)
  return Response.json({ ok: true })
}
