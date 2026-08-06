import { eq } from 'drizzle-orm'
import type { NextRequest } from 'next/server'
import { revalidatePosts, validatePublishable } from '@/lib/admin/post-service'
import { requireAdminApi } from '@/lib/admin/session'
import { getDb } from '@/lib/db/client'
import { posts } from '@/lib/db/schema'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminApi()
  if (session instanceof Response) return session

  const { id } = await params
  const body = await request.json().catch(() => null)
  const status = body?.status
  if (
    status !== 'draft' &&
    status !== 'published' &&
    status !== 'private' &&
    status !== 'archived'
  ) {
    return Response.json(
      { error: 'status는 draft/published/private/archived 중 하나여야 합니다' },
      { status: 400 }
    )
  }

  const db = getDb()
  const [post] = await db.select().from(posts).where(eq(posts.id, id))
  if (!post) return Response.json({ error: 'Not found' }, { status: 404 })

  // 비공개 전환도 완성된 글이어야 함 (draft→private 직행 포함)
  if (status === 'published' || status === 'private') {
    const problems = await validatePublishable(id)
    if (problems.length > 0) {
      return Response.json({ error: '게시할 수 없습니다', problems }, { status: 422 })
    }
  }

  await db
    .update(posts)
    .set({
      status,
      // 최초 게시/비공개 전환 시 게시일 자동 설정
      date: (status === 'published' || status === 'private') && !post.date ? new Date() : post.date,
      updatedAt: new Date(),
    })
    .where(eq(posts.id, id))

  revalidatePosts()
  return Response.json({ ok: true, status })
}
