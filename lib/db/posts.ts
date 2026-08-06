// 공개 페이지용 게시글 조회 — 전부 'posts' 태그로 캐시되고, 관리자 mutation 시 revalidateTag('posts')로 무효화된다.
import { eq, inArray } from 'drizzle-orm'
import { slug as slugify } from 'github-slugger'
import { unstable_cache } from 'next/cache'
import siteMetadata from '@/data/siteMetadata'
import type { Post, PostCore } from '@/lib/types/post'
import { getDb } from './client'
import { posts, postTranslations } from './schema'

const loadPublishedPosts = unstable_cache(
  async (): Promise<Post[]> => {
    const db = getDb()
    const rows = await db.select().from(posts).where(eq(posts.status, 'published'))
    if (rows.length === 0) return []
    const translations = await db
      .select()
      .from(postTranslations)
      .where(
        inArray(
          postTranslations.postId,
          rows.map((r) => r.id)
        )
      )

    const result: Post[] = []
    for (const post of rows) {
      const date = (post.date ?? post.createdAt).toISOString()
      const lastmod = post.lastmod?.toISOString()
      for (const tr of translations.filter((t) => t.postId === post.id)) {
        if (!tr.compiledCode || !tr.title.trim()) continue
        result.push({
          slug: post.slug,
          path: `blog/${post.slug}`,
          filePath: '',
          title: tr.title,
          summary: tr.summary ?? undefined,
          date,
          lastmod,
          tags: post.tags,
          draft: false,
          language: tr.language,
          layout: post.layout ?? undefined,
          images: post.images ?? undefined,
          toc: tr.toc ?? [],
          readingTime: tr.readingTime ?? { text: '', minutes: 0, time: 0, words: 0 },
          structuredData: {
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: tr.title,
            datePublished: date,
            dateModified: lastmod || date,
            description: tr.summary ?? undefined,
            image: post.images ? (post.images as string[])[0] : siteMetadata.socialBanner,
            url: `${siteMetadata.siteUrl}/blog/${post.slug}`,
          },
          body: { code: tr.compiledCode },
        })
      }
    }
    // 최신순 정렬 (pliny sortPosts와 동일)
    return result.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  },
  ['published-posts'],
  { tags: ['posts'] }
)

function stripBody(post: Post): PostCore {
  const { body: _body, ...core } = post
  return core
}

/** 목록/검색/RSS용 — 본문 제외 */
export async function getPublishedCores(): Promise<PostCore[]> {
  return (await loadPublishedPosts()).map(stripBody)
}

/** 상세 페이지용 — 해당 slug의 언어별 문서(컴파일된 본문 포함) */
export async function getPostPair(slug: string): Promise<Post[]> {
  return (await loadPublishedPosts()).filter((p) => p.slug === slug)
}

/** 태그 카운트 — slug당 1회 카운트 (기존 createTagCount 로직) */
export async function getTagCounts(): Promise<Record<string, number>> {
  const cores = await getPublishedCores()
  const tagCount: Record<string, number> = {}
  const processed = new Set<string>()
  for (const post of cores) {
    if (processed.has(post.slug)) continue
    processed.add(post.slug)
    for (const tag of post.tags) {
      const formatted = slugify(tag)
      tagCount[formatted] = (tagCount[formatted] ?? 0) + 1
    }
  }
  return tagCount
}

/** 특정 태그의 글 목록 (본문 제외, 최신순) */
export async function getCoresByTag(tag: string): Promise<PostCore[]> {
  const cores = await getPublishedCores()
  return cores.filter((p) => p.tags.map((t) => slugify(t)).includes(tag))
}

/**
 * 상세 페이지에서 404와 비공개 안내를 구분하기 위한 조회.
 * published/private만 반환하고 draft/archived/미존재는 null (=404 유지).
 */
export const getPostStatusBySlug = unstable_cache(
  async (slug: string): Promise<'published' | 'private' | null> => {
    const db = getDb()
    const [row] = await db.select({ status: posts.status }).from(posts).where(eq(posts.slug, slug))
    if (!row) return null
    return row.status === 'published' || row.status === 'private' ? row.status : null
  },
  ['post-status-by-slug'],
  { tags: ['posts'] }
)
