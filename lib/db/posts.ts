// 공개 페이지용 게시글 조회 — 전부 'posts' 태그로 캐시되고, 관리자 mutation 시 revalidateTag('posts')로 무효화된다.
import { eq, inArray } from 'drizzle-orm'
import { slug as slugify } from 'github-slugger'
import { unstable_cache } from 'next/cache'
import { isLocale, LOCALES, type Locale } from '@/lib/i18n/config'
import type { Post, PostCore } from '@/lib/types/post'
import { getDb } from './client'
import { posts, postTranslations } from './schema'

// images jsonb는 과거 데이터에 문자열로 저장된 경우가 있어 항상 string[]로 정규화
function normalizeImages(value: unknown): string[] | undefined {
  if (typeof value === 'string') return value ? [value] : undefined
  if (Array.isArray(value)) {
    const urls = value.filter((v): v is string => typeof v === 'string' && v.length > 0)
    return urls.length > 0 ? urls : undefined
  }
  return undefined
}

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
      const updatedAt = post.updatedAt?.toISOString()
      const images = normalizeImages(post.images)
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
          updatedAt,
          tags: post.tags,
          draft: false,
          language: tr.language,
          layout: post.layout ?? undefined,
          images,
          toc: tr.toc ?? [],
          readingTime: tr.readingTime ?? { text: '', minutes: 0, time: 0, words: 0 },
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

/**
 * 목록/검색/RSS용 — 본문 제외, 해당 언어만.
 *
 * 캐시 로더는 양 언어를 통째로 들고 있고 필터는 여기서 한다. 언어별로 캐시 키를 쪼개면
 * revalidateTag('posts') 시 ko/en 중 한쪽만 신선한 창이 생기고 콜드스타트 DB 왕복도 2배가 된다.
 */
export async function getPublishedCores(language: Locale): Promise<PostCore[]> {
  return (await loadPublishedPosts()).filter((p) => p.language === language).map(stripBody)
}

/** 언어 무관 — sitemap처럼 양 언어를 함께 봐야 하는 곳에서만 쓴다 */
export async function getAllCores(): Promise<PostCore[]> {
  return (await loadPublishedPosts()).map(stripBody)
}

/** 상세 페이지용 — 해당 언어의 문서(컴파일된 본문 포함). 없으면 null */
export async function getPost(slug: string, language: Locale): Promise<Post | null> {
  return (
    (await loadPublishedPosts()).find((p) => p.slug === slug && p.language === language) ?? null
  )
}

/** 이 글이 존재하는 언어 목록 — hreflang과 미번역 안내에 쓴다 */
export async function getPostLocales(slug: string): Promise<Locale[]> {
  const langs = (await loadPublishedPosts())
    .filter((p) => p.slug === slug)
    .map((p) => p.language)
    .filter(isLocale)
  return LOCALES.filter((l) => langs.includes(l))
}

/** 태그 카운트 — 해당 언어로 존재하는 글만 센다 */
export async function getTagCounts(language: Locale): Promise<Record<string, number>> {
  const cores = await getPublishedCores(language)
  const tagCount: Record<string, number> = {}
  for (const post of cores) {
    for (const tag of post.tags) {
      const formatted = slugify(tag)
      tagCount[formatted] = (tagCount[formatted] ?? 0) + 1
    }
  }
  return tagCount
}

/** 특정 태그의 글 목록 (본문 제외, 최신순) */
export async function getCoresByTag(tag: string, language: Locale): Promise<PostCore[]> {
  const cores = await getPublishedCores(language)
  return cores.filter((p) => p.tags.map((t) => slugify(t)).includes(tag))
}

/** 공개 MCP·llms.txt용 마크다운 원문 — published만 SQL 레벨에서 필터 */
export interface PublishedPostMarkdown {
  slug: string
  tags: string[]
  date: string
  lastmod?: string
  translations: Partial<Record<'ko' | 'en', { title: string; summary?: string; markdown: string }>>
}

const loadPublishedMarkdown = unstable_cache(
  async (): Promise<PublishedPostMarkdown[]> => {
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

    const result: PublishedPostMarkdown[] = []
    for (const post of rows) {
      const item: PublishedPostMarkdown = {
        slug: post.slug,
        tags: post.tags,
        date: (post.date ?? post.createdAt).toISOString(),
        lastmod: post.lastmod?.toISOString(),
        translations: {},
      }
      for (const tr of translations.filter((t) => t.postId === post.id)) {
        if (!tr.compiledCode || !tr.title.trim()) continue
        item.translations[tr.language as 'ko' | 'en'] = {
          title: tr.title,
          summary: tr.summary ?? undefined,
          markdown: tr.contentMd,
        }
      }
      if (Object.keys(item.translations).length > 0) result.push(item)
    }
    return result.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  },
  ['published-posts-markdown'],
  { tags: ['posts'] }
)

/** 공개 post_get용 — published가 아니면 null (draft/private/archived 구분 없이 미존재 취급) */
export async function getPublishedPostMarkdown(
  slug: string
): Promise<PublishedPostMarkdown | null> {
  return (await loadPublishedMarkdown()).find((p) => p.slug === slug) ?? null
}

/** llms-full.txt·공개 검색용 — 전체 published 글 (최신순) */
export async function getAllPublishedMarkdown(): Promise<PublishedPostMarkdown[]> {
  return loadPublishedMarkdown()
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
