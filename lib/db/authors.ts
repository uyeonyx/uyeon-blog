// 공개 페이지용 작성자 조회 — 'authors' 태그로 캐시, mutation 시 revalidateTag('authors')
import { eq } from 'drizzle-orm'
import { unstable_cache } from 'next/cache'
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
        body: { code: tr.compiledCode ?? '' },
      })
    }
    return result
  },
  ['author-by-slug'],
  { tags: ['authors'] }
)

/** about 페이지용 — 양 언어 전부 (클라이언트에서 locale 선택 + en 폴백) */
export async function getAuthorPair(slug = 'default'): Promise<Author[]> {
  return loadAuthor(slug)
}

/** 블로그 글 하단/메타데이터용 — 본문·구조화 데이터 제외 */
export async function getAuthorCores(slug = 'default'): Promise<AuthorCore[]> {
  return (await loadAuthor(slug)).map(
    ({ techStack: _techStack, timeline: _timeline, body: _body, ...core }) => core
  )
}
