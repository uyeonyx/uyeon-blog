import { and, eq } from 'drizzle-orm'
import { revalidateTag } from 'next/cache'
import { getDb } from '@/lib/db/client'
import { posts, postTranslations } from '@/lib/db/schema'
import { smartQuotes } from '@/lib/utils'
import { prepareContent } from './content-compile'

export const LANGUAGES = ['ko', 'en'] as const
export type Language = (typeof LANGUAGES)[number]

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export interface TranslationInput {
  title: string
  summary?: string | null
  // biome-ignore lint/suspicious/noExplicitAny: Tiptap JSON 문서
  contentJson: any
}

export interface CompileResult {
  language: Language
  ok: boolean
  error?: string
}

/** 번역 1건 저장 + 컴파일. 컴파일 실패해도 원본(JSON/MD)은 저장하고 결과만 보고한다. */
export async function saveTranslation(
  postId: string,
  language: Language,
  input: TranslationInput
): Promise<CompileResult> {
  const db = getDb()
  const title = smartQuotes(input.title ?? '')
  const summary = input.summary ? smartQuotes(input.summary) : null

  const prepared = await prepareContent(input.contentJson)

  await db
    .update(postTranslations)
    .set({
      title,
      summary,
      contentJson: input.contentJson ?? null,
      contentMd: prepared.contentMd,
      compiledCode: prepared.compiledCode,
      toc: prepared.toc,
      readingTime: prepared.readingTime,
      compiledAt: prepared.compiledAt,
    })
    .where(and(eq(postTranslations.postId, postId), eq(postTranslations.language, language)))

  return { language, ok: !prepared.error, error: prepared.error ?? undefined }
}

/** 게시 가능 여부: 양 언어 모두 제목과 컴파일 성공한 본문 필요 */
export async function validatePublishable(postId: string): Promise<string[]> {
  const db = getDb()
  const translations = await db
    .select()
    .from(postTranslations)
    .where(eq(postTranslations.postId, postId))

  const problems: string[] = []
  for (const lang of LANGUAGES) {
    const tr = translations.find((t) => t.language === lang)
    if (!tr || !tr.title.trim()) {
      problems.push(`${lang}: 제목이 비어 있습니다`)
      continue
    }
    if (!tr.contentMd.trim()) {
      problems.push(`${lang}: 본문이 비어 있습니다`)
      continue
    }
    if (!tr.compiledCode) {
      problems.push(`${lang}: 본문 컴파일에 실패한 상태입니다`)
    }
  }
  return problems
}

export async function touchPost(postId: string) {
  const db = getDb()
  await db
    .update(posts)
    .set({ updatedAt: new Date(), lastmod: new Date() })
    .where(eq(posts.id, postId))
}

/** 공개 페이지 캐시 무효화 — 모든 mutation 후 호출 (즉시 만료) */
export function revalidatePosts() {
  revalidateTag('posts', { expire: 0 })
}
