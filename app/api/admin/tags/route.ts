import { eq } from 'drizzle-orm'
import type { NextRequest } from 'next/server'
import { requireAdminApi } from '@/lib/admin/session'
import { listTagUsage, normalizeTag, revalidateTagMaster } from '@/lib/admin/tag-service'
import { getDb } from '@/lib/db/client'
import { tags } from '@/lib/db/schema'

/** 태그 목록 + 사용량 — 에디터 자동완성과 관리 페이지가 공유한다 */
export async function GET() {
  const session = await requireAdminApi()
  if (session instanceof Response) return session

  return Response.json({ items: await listTagUsage() })
}

export async function POST(request: NextRequest) {
  const session = await requireAdminApi()
  if (session instanceof Response) return session

  const body = await request.json().catch(() => null)
  if (!body) return Response.json({ error: 'Invalid body' }, { status: 400 })

  const labelKo = typeof body.labelKo === 'string' ? body.labelKo.trim() : ''
  const labelEn = typeof body.labelEn === 'string' ? body.labelEn.trim() : ''
  const slug = normalizeTag(typeof body.slug === 'string' && body.slug.trim() ? body.slug : labelEn)
  if (!slug) return Response.json({ error: 'slug 또는 영문 라벨이 필요합니다' }, { status: 400 })

  const db = getDb()
  const existing = await db.select({ slug: tags.slug }).from(tags).where(eq(tags.slug, slug))
  if (existing.length > 0) {
    return Response.json({ error: `이미 존재하는 태그입니다: ${slug}` }, { status: 409 })
  }

  const [row] = await db
    .insert(tags)
    .values({ slug, labelKo: labelKo || slug, labelEn: labelEn || slug })
    .returning()
  revalidateTagMaster()
  return Response.json({ ok: true, tag: row })
}
