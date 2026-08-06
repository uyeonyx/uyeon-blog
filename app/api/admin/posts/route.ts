import { desc, eq } from 'drizzle-orm'
import type { NextRequest } from 'next/server'
import { LANGUAGES, revalidatePosts, SLUG_PATTERN } from '@/lib/admin/post-service'
import { requireAdminApi } from '@/lib/admin/session'
import { getDb } from '@/lib/db/client'
import { posts, postTranslations } from '@/lib/db/schema'

export async function GET(request: NextRequest) {
  const session = await requireAdminApi()
  if (session instanceof Response) return session

  const db = getDb()
  const status = request.nextUrl.searchParams.get('status')

  const [rows, translations] = await Promise.all([
    db
      .select()
      .from(posts)
      .where(
        status === 'draft' || status === 'published' || status === 'archived'
          ? eq(posts.status, status)
          : undefined
      )
      .orderBy(desc(posts.updatedAt)),
    db.select().from(postTranslations),
  ])

  const items = rows.map((post) => {
    const trs = translations.filter((t) => t.postId === post.id)
    const ko = trs.find((t) => t.language === 'ko')
    const en = trs.find((t) => t.language === 'en')
    return {
      id: post.id,
      slug: post.slug,
      status: post.status,
      tags: post.tags,
      date: post.date,
      updatedAt: post.updatedAt,
      title: ko?.title || en?.title || '(제목 없음)',
    }
  })

  return Response.json({ items })
}

export async function POST(request: NextRequest) {
  const session = await requireAdminApi()
  if (session instanceof Response) return session

  const body = await request.json().catch(() => null)
  const slug = typeof body?.slug === 'string' ? body.slug.trim() : ''
  if (!SLUG_PATTERN.test(slug)) {
    return Response.json(
      { error: 'slug는 소문자/숫자/하이픈만 사용할 수 있습니다' },
      { status: 400 }
    )
  }

  const db = getDb()
  const existing = await db.select({ id: posts.id }).from(posts).where(eq(posts.slug, slug))
  if (existing.length > 0) {
    return Response.json({ error: '이미 존재하는 slug입니다' }, { status: 409 })
  }

  const [post] = await db.insert(posts).values({ slug }).returning()
  await db
    .insert(postTranslations)
    .values(LANGUAGES.map((language) => ({ postId: post.id, language })))

  revalidatePosts()
  return Response.json({ id: post.id, slug: post.slug }, { status: 201 })
}
