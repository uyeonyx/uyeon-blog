// 공개 페이지용 작성자 조회 — 'authors' 태그로 캐시, mutation 시 revalidateTag('authors')
import { eq } from 'drizzle-orm'
import { unstable_cache } from 'next/cache'
import type { Locale } from '@/lib/i18n/config'
import type { Author, AuthorCore, TechCategory, TimelineItem } from '@/lib/types/author'
import { getDb } from './client'
import { authors, authorTranslations } from './schema'

const loadAuthor = unstable_cache(
  async (slug: string): Promise<Author[]> => {
    const db = getDb()
    const [row] = await db.select().from(authors).where(eq(authors.slug, slug))
    if (!row) return []
    const translations = await db
      .select()
      .from(authorTranslations)
      .where(eq(authorTranslations.authorId, row.id))

    const result: Author[] = []
    for (const tr of translations) {
      if (!tr.name.trim()) continue
      result.push({
        slug: row.slug,
        language: tr.language,
        name: tr.name,
        avatar: row.avatarUrl ?? undefined,
        occupation: tr.occupation ?? undefined,
        company: tr.company ?? undefined,
        email: row.email ?? undefined,
        github: row.github ?? undefined,
        linkedin: row.linkedin ?? undefined,
        twitter: row.twitter ?? undefined,
        bluesky: row.bluesky ?? undefined,
        techStack: (tr.techStack as TechCategory[]) ?? [],
        timeline: (tr.timeline as TimelineItem[]) ?? [],
        updatedAt: row.updatedAt.toISOString(),
        body: { code: tr.compiledCode ?? '' },
      })
    }
    return result
  },
  ['author-by-slug'],
  { tags: ['authors'] }
)

/** about 페이지용 — 해당 언어(없으면 en 폴백) */
export async function getAuthor(language: Locale, slug = 'default'): Promise<Author | null> {
  const rows = await loadAuthor(slug)
  return rows.find((a) => a.language === language) ?? rows.find((a) => a.language === 'en') ?? null
}

/** 블로그 글 하단/메타데이터용 — 본문·구조화 데이터 제외 */
export async function getAuthorCore(
  language: Locale,
  slug = 'default'
): Promise<AuthorCore | null> {
  const author = await getAuthor(language, slug)
  if (!author) return null
  const { techStack: _techStack, timeline: _timeline, body: _body, ...core } = author
  return core
}

/** 공개 MCP about_get·llms.txt용 — 프로필 + 언어별 소개 마크다운 원문 */
export interface AuthorMarkdown {
  slug: string
  avatar?: string
  email?: string
  github?: string
  linkedin?: string
  twitter?: string
  bluesky?: string
  translations: Partial<
    Record<
      'ko' | 'en',
      {
        name: string
        occupation?: string
        company?: string
        techStack: TechCategory[]
        timeline: TimelineItem[]
        markdown: string
      }
    >
  >
}

const loadAuthorMarkdown = unstable_cache(
  async (slug: string): Promise<AuthorMarkdown | null> => {
    const db = getDb()
    const [row] = await db.select().from(authors).where(eq(authors.slug, slug))
    if (!row) return null
    const translations = await db
      .select()
      .from(authorTranslations)
      .where(eq(authorTranslations.authorId, row.id))

    const item: AuthorMarkdown = {
      slug: row.slug,
      avatar: row.avatarUrl ?? undefined,
      email: row.email ?? undefined,
      github: row.github ?? undefined,
      linkedin: row.linkedin ?? undefined,
      twitter: row.twitter ?? undefined,
      bluesky: row.bluesky ?? undefined,
      translations: {},
    }
    for (const tr of translations) {
      if (!tr.name.trim()) continue
      item.translations[tr.language as 'ko' | 'en'] = {
        name: tr.name,
        occupation: tr.occupation ?? undefined,
        company: tr.company ?? undefined,
        techStack: (tr.techStack as TechCategory[]) ?? [],
        timeline: (tr.timeline as TimelineItem[]) ?? [],
        markdown: tr.contentMd,
      }
    }
    return item
  },
  ['author-markdown'],
  { tags: ['authors'] }
)

export async function getAuthorMarkdown(slug = 'default'): Promise<AuthorMarkdown | null> {
  return loadAuthorMarkdown(slug)
}
