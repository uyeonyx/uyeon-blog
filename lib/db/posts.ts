// 공개 페이지용 게시글 조회 — 전부 'posts' 태그로 캐시되고, 관리자 mutation 시 revalidateTag('posts')로 무효화된다.
//
// 캐시 항목은 세 종류로 쪼갠다 (Vercel 데이터 캐시는 항목당 2MB 제한 — 넘으면 쓰기가 조용히
// 버려져 캐시가 무증상으로 전멸한다):
//  - cores: 전체 글 메타데이터(본문 제외), 양 언어 단일 항목
//  - bodies: slug별 컴파일된 본문 — 글 수에 비례해 커지는 유일한 데이터를 항목별로 분산
//  - status index: slug→status 소형 단일 항목 (404 경로가 사용자 입력으로 캐시 키를 만들지 않게)
import { and, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm'
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

/**
 * 전체 published 글의 코어(본문 제외) — 양 언어 단일 캐시 항목.
 * 언어별로 캐시 키를 쪼개면 revalidateTag('posts') 시 ko/en 중 한쪽만 신선한 창이 생기고
 * 콜드스타트 DB 왕복도 2배가 된다. 필터는 accessor에서 한다.
 */
const loadPublishedCores = unstable_cache(
  async (): Promise<PostCore[]> => {
    const db = getDb()
    const rows = await db
      .select()
      .from(posts)
      .where(eq(posts.status, 'published'))
      .orderBy(desc(sql`coalesce(${posts.date}, ${posts.createdAt})`))
    if (rows.length === 0) return []
    const translations = await db
      .select({
        postId: postTranslations.postId,
        language: postTranslations.language,
        title: postTranslations.title,
        summary: postTranslations.summary,
        coverImage: postTranslations.coverImage,
        toc: postTranslations.toc,
        readingTime: postTranslations.readingTime,
        compiledOk: isNotNull(postTranslations.compiledCode).mapWith(Boolean),
        // 컴파일 출력의 katex 클래스 존재 여부 — 상세 페이지의 katex CSS 조건부 로드용
        hasMath: sql<boolean>`coalesce(${postTranslations.compiledCode} LIKE '%katex%', false)`,
      })
      .from(postTranslations)
      .where(
        inArray(
          postTranslations.postId,
          rows.map((r) => r.id)
        )
      )

    const byPost = new Map<string, typeof translations>()
    for (const tr of translations) {
      const list = byPost.get(tr.postId) ?? []
      list.push(tr)
      byPost.set(tr.postId, list)
    }

    // rows가 이미 최신순이므로 결과도 최신순 — 별도 정렬 불필요
    const result: PostCore[] = []
    for (const post of rows) {
      const date = (post.date ?? post.createdAt).toISOString()
      const lastmod = post.lastmod?.toISOString()
      const updatedAt = post.updatedAt?.toISOString()
      const images = normalizeImages(post.images)
      for (const tr of byPost.get(post.id) ?? []) {
        if (!tr.compiledOk || !tr.title.trim()) continue
        result.push({
          slug: post.slug,
          path: `blog/${post.slug}`,
          title: tr.title,
          summary: tr.summary ?? undefined,
          date,
          lastmod,
          updatedAt,
          tags: post.tags,
          draft: false,
          language: tr.language,
          layout: post.layout ?? undefined,
          // 언어 전용 대표 이미지가 있으면 그것이 images[0](OG/썸네일/배너)이 된다
          images: tr.coverImage ? [tr.coverImage, ...(images ?? [])] : images,
          hasMath: tr.hasMath,
          toc: tr.toc ?? [],
          readingTime: tr.readingTime ?? { text: '', minutes: 0, time: 0, words: 0 },
        })
      }
    }
    return result
  },
  ['published-post-cores'],
  { tags: ['posts'] }
)

/**
 * slug 하나의 컴파일된 본문(양 언어) — slug별 캐시 항목.
 * 반드시 core 조회가 성공한 slug로만 호출할 것 — 사용자 입력을 그대로 넘기면
 * 존재하지 않는 slug마다 캐시 항목이 생겨 키 공간이 무한히 늘어난다.
 */
const loadPostBodies = unstable_cache(
  async (slug: string): Promise<Partial<Record<'ko' | 'en', string>>> => {
    const db = getDb()
    const rows = await db
      .select({ language: postTranslations.language, code: postTranslations.compiledCode })
      .from(postTranslations)
      .innerJoin(posts, eq(postTranslations.postId, posts.id))
      .where(and(eq(posts.slug, slug), eq(posts.status, 'published')))
    const bodies: Partial<Record<'ko' | 'en', string>> = {}
    for (const row of rows) {
      if (row.code) bodies[row.language as 'ko' | 'en'] = row.code
    }
    return bodies
  },
  ['post-body'],
  { tags: ['posts'] }
)

/** 목록/검색/RSS용 — 본문 제외, 해당 언어만 */
export async function getPublishedCores(language: Locale): Promise<PostCore[]> {
  return (await loadPublishedCores()).filter((p) => p.language === language)
}

/** 언어 무관 — sitemap처럼 양 언어를 함께 봐야 하는 곳에서만 쓴다 */
export async function getAllCores(): Promise<PostCore[]> {
  return loadPublishedCores()
}

/** 메타데이터/OG용 — 본문 없이 코어만. 없으면 null */
export async function getPublishedCore(slug: string, language: Locale): Promise<PostCore | null> {
  return (
    (await loadPublishedCores()).find((p) => p.slug === slug && p.language === language) ?? null
  )
}

/** 상세 페이지용 — 해당 언어의 문서(컴파일된 본문 포함). 없으면 null */
export async function getPost(slug: string, language: Locale): Promise<Post | null> {
  const core = await getPublishedCore(slug, language)
  if (!core) return null // 본문 로더 호출 전에 차단 — slug별 캐시 키를 실제 글로 한정
  const code = (await loadPostBodies(slug))[language as 'ko' | 'en']
  // core는 compiledOk였는데 본문이 없다면 그 사이 revalidate와 경합한 것 — 미존재로 취급
  if (!code) return null
  return { ...core, body: { code } }
}

/** 이 글이 존재하는 언어 목록 — hreflang과 미번역 안내에 쓴다 */
export async function getPostLocales(slug: string): Promise<Locale[]> {
  const langs = (await loadPublishedCores())
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

// 단일 항목 유지 — llms-full.txt와 MCP 검색이 전체 마크다운을 실제로 소비하고, 원문 MD는
// 컴파일된 MDX보다 한 자릿수 작다. 원문 총량이 2MB에 근접하면 bodies처럼 slug별로 쪼갤 것.
const loadPublishedMarkdown = unstable_cache(
  async (): Promise<PublishedPostMarkdown[]> => {
    const db = getDb()
    const rows = await db
      .select()
      .from(posts)
      .where(eq(posts.status, 'published'))
      .orderBy(desc(sql`coalesce(${posts.date}, ${posts.createdAt})`))
    if (rows.length === 0) return []
    const translations = await db
      .select({
        postId: postTranslations.postId,
        language: postTranslations.language,
        title: postTranslations.title,
        summary: postTranslations.summary,
        contentMd: postTranslations.contentMd,
        compiledOk: isNotNull(postTranslations.compiledCode).mapWith(Boolean),
      })
      .from(postTranslations)
      .where(
        inArray(
          postTranslations.postId,
          rows.map((r) => r.id)
        )
      )

    const byPost = new Map<string, typeof translations>()
    for (const tr of translations) {
      const list = byPost.get(tr.postId) ?? []
      list.push(tr)
      byPost.set(tr.postId, list)
    }

    const result: PublishedPostMarkdown[] = []
    for (const post of rows) {
      const item: PublishedPostMarkdown = {
        slug: post.slug,
        tags: post.tags,
        date: (post.date ?? post.createdAt).toISOString(),
        lastmod: post.lastmod?.toISOString(),
        translations: {},
      }
      for (const tr of byPost.get(post.id) ?? []) {
        if (!tr.compiledOk || !tr.title.trim()) continue
        item.translations[tr.language as 'ko' | 'en'] = {
          title: tr.title,
          summary: tr.summary ?? undefined,
          markdown: tr.contentMd,
        }
      }
      if (Object.keys(item.translations).length > 0) result.push(item)
    }
    return result
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
 * slug→status 인덱스 — 단일 소형 캐시 항목.
 * slug를 캐시 키에 넣으면(이전 구현) 404 경로가 사용자 입력마다 캐시 항목 + DB 왕복을
 * 만들게 되므로, 전체 인덱스를 한 번에 들고 메모리에서 찾는다.
 */
const loadPostStatusIndex = unstable_cache(
  async (): Promise<Record<string, 'published' | 'private'>> => {
    const db = getDb()
    const rows = await db
      .select({ slug: posts.slug, status: posts.status })
      .from(posts)
      .where(inArray(posts.status, ['published', 'private']))
    const index: Record<string, 'published' | 'private'> = {}
    for (const row of rows) {
      index[row.slug] = row.status as 'published' | 'private'
    }
    return index
  },
  ['post-status-index'],
  { tags: ['posts'] }
)

/**
 * 상세 페이지에서 404와 비공개 안내를 구분하기 위한 조회.
 * published/private만 반환하고 draft/archived/미존재는 null (=404 유지).
 */
export async function getPostStatusBySlug(slug: string): Promise<'published' | 'private' | null> {
  return (await loadPostStatusIndex())[slug] ?? null
}
