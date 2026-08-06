import { eq } from 'drizzle-orm'
import type { NextRequest } from 'next/server'
import {
  LANGUAGES,
  revalidatePosts,
  SLUG_PATTERN,
  saveTranslation,
  touchPost,
} from '@/lib/admin/post-service'
import { requireAdminApi } from '@/lib/admin/session'
import { getDb } from '@/lib/db/client'
import { posts, postTranslations } from '@/lib/db/schema'

type Params = { params: Promise<{ id: string }> }

async function findPost(id: string) {
  const db = getDb()
  const [post] = await db.select().from(posts).where(eq(posts.id, id))
  return post ?? null
}

export async function GET(_request: NextRequest, { params }: Params) {
  const session = await requireAdminApi()
  if (session instanceof Response) return session

  const { id } = await params
  const post = await findPost(id)
  if (!post) return Response.json({ error: 'Not found' }, { status: 404 })

  const db = getDb()
  const translations = await db
    .select()
    .from(postTranslations)
    .where(eq(postTranslations.postId, id))

  return Response.json({
    id: post.id,
    slug: post.slug,
    status: post.status,
    tags: post.tags,
    layout: post.layout,
    date: post.date,
    lastmod: post.lastmod,
    translations: Object.fromEntries(
      translations.map((t) => [
        t.language,
        {
          title: t.title,
          summary: t.summary,
          contentJson: t.contentJson,
          compileOk: !!t.compiledCode || !t.contentMd.trim(),
        },
      ])
    ),
  })
}

export async function PUT(request: NextRequest, { params }: Params) {
  const session = await requireAdminApi()
  if (session instanceof Response) return session

  const { id } = await params
  const post = await findPost(id)
  if (!post) return Response.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json().catch(() => null)
  if (!body) return Response.json({ error: 'Invalid body' }, { status: 400 })

  const db = getDb()

  // slug 변경은 draft 상태에서만 허용 (게시된 URL 보호)
  if (typeof body.slug === 'string' && body.slug !== post.slug) {
    if (post.status !== 'draft') {
      return Response.json({ error: '게시된 글의 slug는 변경할 수 없습니다' }, { status: 400 })
    }
    if (!SLUG_PATTERN.test(body.slug)) {
      return Response.json(
        { error: 'slug는 소문자/숫자/하이픈만 사용할 수 있습니다' },
        { status: 400 }
      )
    }
    const dup = await db.select({ id: posts.id }).from(posts).where(eq(posts.slug, body.slug))
    if (dup.length > 0 && dup[0].id !== id) {
      return Response.json({ error: '이미 존재하는 slug입니다' }, { status: 409 })
    }
  }

  const tags = Array.isArray(body.tags)
    ? body.tags.map((t: unknown) => String(t).trim()).filter(Boolean)
    : post.tags
  const layout =
    body.layout === 'PostLayout' || body.layout === 'PostSimple' || body.layout === 'PostBanner'
      ? body.layout
      : null
  const date = body.date ? new Date(body.date) : post.date

  await db
    .update(posts)
    .set({
      slug: typeof body.slug === 'string' && post.status === 'draft' ? body.slug : post.slug,
      tags,
      layout,
      date: date && !Number.isNaN(date.getTime()) ? date : post.date,
      lastmod: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(posts.id, id))

  const compileResults: Awaited<ReturnType<typeof saveTranslation>>[] = []
  for (const language of LANGUAGES) {
    const input = body.translations?.[language]
    if (input) {
      compileResults.push(
        await saveTranslation(id, language, {
          title: String(input.title ?? ''),
          summary: input.summary ? String(input.summary) : null,
          contentJson: input.contentJson ?? null,
        })
      )
    }
  }

  revalidatePosts()
  return Response.json({ ok: true, compileResults })
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await requireAdminApi()
  if (session instanceof Response) return session

  const { id } = await params
  const post = await findPost(id)
  if (!post) return Response.json({ error: 'Not found' }, { status: 404 })

  const db = getDb()
  await db.delete(posts).where(eq(posts.id, id))

  revalidatePosts()
  return Response.json({ ok: true })
}
