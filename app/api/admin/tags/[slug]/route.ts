import { arrayContains, eq } from 'drizzle-orm'
import type { NextRequest } from 'next/server'
import { revalidatePosts } from '@/lib/admin/post-service'
import { revalidateProjects } from '@/lib/admin/project-service'
import { requireAdminApi } from '@/lib/admin/session'
import { renameTag, revalidateTagMaster, updateTagLabels } from '@/lib/admin/tag-service'
import { getDb } from '@/lib/db/client'
import { posts, projects, tags } from '@/lib/db/schema'

type Params = { params: Promise<{ slug: string }> }

export async function PUT(request: NextRequest, { params }: Params) {
  const session = await requireAdminApi()
  if (session instanceof Response) return session

  const { slug } = await params
  const body = await request.json().catch(() => null)
  if (!body) return Response.json({ error: 'Invalid body' }, { status: 400 })

  // rename/병합 — 콘텐츠 배열까지 함께 치환되므로 posts/projects 캐시도 무효화
  if (typeof body.renameTo === 'string' && body.renameTo.trim()) {
    const result = await renameTag(slug, body.renameTo)
    if (!result.ok) {
      if (result.error === 'not_found') {
        return Response.json({ error: '태그를 찾을 수 없습니다' }, { status: 404 })
      }
      if (result.error === 'same_slug') {
        return Response.json({ error: '같은 slug입니다' }, { status: 400 })
      }
      return Response.json({ error: '유효하지 않은 slug입니다' }, { status: 400 })
    }
    revalidateTagMaster()
    revalidatePosts()
    revalidateProjects()
    return Response.json({
      ok: true,
      merged: result.merged,
      postCount: result.postCount,
      projectCount: result.projectCount,
    })
  }

  const labelKo = typeof body.labelKo === 'string' ? body.labelKo.trim() : undefined
  const labelEn = typeof body.labelEn === 'string' ? body.labelEn.trim() : undefined
  if (labelKo === undefined && labelEn === undefined) {
    return Response.json({ error: '변경할 내용이 없습니다' }, { status: 400 })
  }
  const row = await updateTagLabels(slug, { labelKo, labelEn })
  if (!row) return Response.json({ error: '태그를 찾을 수 없습니다' }, { status: 404 })

  revalidateTagMaster()
  return Response.json({ ok: true, tag: row })
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await requireAdminApi()
  if (session instanceof Response) return session

  const { slug } = await params
  const db = getDb()
  const [row] = await db.select({ slug: tags.slug }).from(tags).where(eq(tags.slug, slug))
  if (!row) return Response.json({ error: '태그를 찾을 수 없습니다' }, { status: 404 })

  const [usedPosts, usedProjects] = await Promise.all([
    db
      .select({ id: posts.id })
      .from(posts)
      .where(arrayContains(posts.tags, [slug])),
    db
      .select({ id: projects.id })
      .from(projects)
      .where(arrayContains(projects.tags, [slug])),
  ])
  if (usedPosts.length > 0 || usedProjects.length > 0) {
    return Response.json(
      {
        error: `사용 중인 태그는 삭제할 수 없습니다 (글 ${usedPosts.length}, 프로젝트 ${usedProjects.length}). 먼저 병합하거나 콘텐츠에서 제거하세요.`,
      },
      { status: 409 }
    )
  }

  await db.delete(tags).where(eq(tags.slug, slug))
  revalidateTagMaster()
  return Response.json({ ok: true })
}
