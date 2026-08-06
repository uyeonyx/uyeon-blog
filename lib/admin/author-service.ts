import { and, eq } from 'drizzle-orm'
import { revalidateTag } from 'next/cache'
import { getDb } from '@/lib/db/client'
import { authors, authorTranslations } from '@/lib/db/schema'
import type { TechCategory, TimelineItem } from '@/lib/types/author'
import { smartQuotes } from '@/lib/utils'
import { prepareContent } from './content-compile'
import { type CompileResult, LANGUAGES, type Language } from './post-service'

export interface AuthorMetaInput {
  avatarUrl?: string | null
  email?: string | null
  github?: string | null
  linkedin?: string | null
  twitter?: string | null
  bluesky?: string | null
}

export interface AuthorTranslationInput {
  name: string
  occupation?: string | null
  company?: string | null
  techStack?: TechCategory[] | null
  timeline?: TimelineItem[] | null
  // biome-ignore lint/suspicious/noExplicitAny: Tiptap JSON 문서
  contentJson: any
}

/** techStack jsonb shape 검증 — 통과 시 null, 실패 시 에러 메시지 */
export function validateTechStack(value: unknown): string | null {
  if (!Array.isArray(value)) return 'techStack은 배열이어야 합니다'
  for (const category of value) {
    if (typeof category?.title !== 'string' || !Array.isArray(category?.techs)) {
      return 'techStack 항목은 {title: string, techs: []} 형태여야 합니다'
    }
    for (const tech of category.techs) {
      if (typeof tech?.name !== 'string' || !Array.isArray(tech?.items)) {
        return 'techs 항목은 {name: string, items: string[]} 형태여야 합니다'
      }
    }
  }
  return null
}

/** timeline jsonb shape 검증 */
export function validateTimeline(value: unknown): string | null {
  if (!Array.isArray(value)) return 'timeline은 배열이어야 합니다'
  for (const item of value) {
    if (
      typeof item?.period !== 'string' ||
      typeof item?.title !== 'string' ||
      typeof item?.company !== 'string' ||
      typeof item?.description !== 'string'
    ) {
      return 'timeline 항목은 {period, title, company, description: string, link?} 형태여야 합니다'
    }
  }
  return null
}

/** 작성자 행이 없으면 생성 (양 언어 translation 행 포함) 후 반환 */
export async function ensureAuthor(slug = 'default') {
  const db = getDb()
  const [existing] = await db.select().from(authors).where(eq(authors.slug, slug))
  if (existing) return existing
  const [row] = await db.insert(authors).values({ slug }).returning()
  await db
    .insert(authorTranslations)
    .values(LANGUAGES.map((language) => ({ authorId: row.id, language })))
  return row
}

export async function getAuthorForEdit(slug = 'default') {
  const db = getDb()
  const author = await ensureAuthor(slug)
  const translations = await db
    .select()
    .from(authorTranslations)
    .where(eq(authorTranslations.authorId, author.id))
  return { author, translations }
}

export async function updateAuthorMeta(id: string, input: AuthorMetaInput) {
  const db = getDb()
  await db
    .update(authors)
    .set({
      ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl || null } : {}),
      ...(input.email !== undefined ? { email: input.email || null } : {}),
      ...(input.github !== undefined ? { github: input.github || null } : {}),
      ...(input.linkedin !== undefined ? { linkedin: input.linkedin || null } : {}),
      ...(input.twitter !== undefined ? { twitter: input.twitter || null } : {}),
      ...(input.bluesky !== undefined ? { bluesky: input.bluesky || null } : {}),
      updatedAt: new Date(),
    })
    .where(eq(authors.id, id))
}

/** 번역 1건 저장 + 소개글 컴파일 — 실패해도 원본은 저장 */
export async function saveAuthorTranslation(
  authorId: string,
  language: Language,
  input: AuthorTranslationInput
): Promise<CompileResult> {
  const db = getDb()
  const prepared = await prepareContent(input.contentJson)

  await db
    .update(authorTranslations)
    .set({
      name: smartQuotes(input.name ?? ''),
      occupation: input.occupation || null,
      company: input.company || null,
      ...(input.techStack !== undefined ? { techStack: input.techStack } : {}),
      ...(input.timeline !== undefined ? { timeline: input.timeline } : {}),
      contentJson: input.contentJson ?? null,
      contentMd: prepared.contentMd,
      compiledCode: prepared.compiledCode,
      compiledAt: prepared.compiledAt,
    })
    .where(
      and(eq(authorTranslations.authorId, authorId), eq(authorTranslations.language, language))
    )

  return { language, ok: !prepared.error, error: prepared.error ?? undefined }
}

/** 공개 페이지 캐시 무효화 — 모든 mutation 후 호출 */
export function revalidateAuthors() {
  revalidateTag('authors', { expire: 0 })
}
