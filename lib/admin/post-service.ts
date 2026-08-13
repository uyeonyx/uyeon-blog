import { desc, eq } from 'drizzle-orm'
import { revalidateTag } from 'next/cache'
import { getDb } from '@/lib/db/client'
import { posts, postTranslations } from '@/lib/db/schema'
import { smartQuotes } from '@/lib/utils'
import { prepareContent } from './content-compile'
import { registerTags } from './tag-service'

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

/**
 * 번역 1건 저장 + 컴파일. 컴파일 실패해도 원본(JSON/MD)은 저장하고 결과만 보고한다.
 * upsert — 번역 행이 유실됐어도 저장이 조용히 no-op되지 않는다. postId가 없으면 FK 위반으로 명시적 실패.
 */
export async function saveTranslation(
  postId: string,
  language: Language,
  input: TranslationInput
): Promise<CompileResult> {
  const db = getDb()
  const prepared = await prepareContent(input.contentJson)

  const values = {
    postId,
    language,
    title: smartQuotes(input.title ?? ''),
    summary: input.summary ? smartQuotes(input.summary) : null,
    contentJson: input.contentJson ?? null,
    contentMd: prepared.contentMd,
    compiledCode: prepared.compiledCode,
    toc: prepared.toc,
    readingTime: prepared.readingTime,
    compiledAt: prepared.compiledAt,
  }
  await db
    .insert(postTranslations)
    .values(values)
    .onConflictDoUpdate({
      target: [postTranslations.postId, postTranslations.language],
      set: {
        title: values.title,
        summary: values.summary,
        contentJson: values.contentJson,
        contentMd: values.contentMd,
        compiledCode: values.compiledCode,
        toc: values.toc,
        readingTime: values.readingTime,
        compiledAt: values.compiledAt,
      },
    })

  return { language, ok: !prepared.error, error: prepared.error ?? undefined }
}

export type CreatePostResult =
  | { ok: true; id: string; slug: string; tags: string[]; createdTags: string[] }
  | { ok: false; error: 'invalid_slug' | 'duplicate' }

/** 글 생성 — posts + 양 언어 빈 translation 행을 한 트랜잭션으로. admin API와 MCP가 공용. */
export async function createPost(slugRaw: string, tags?: string[]): Promise<CreatePostResult> {
  const slug = slugRaw.trim()
  if (!SLUG_PATTERN.test(slug)) return { ok: false, error: 'invalid_slug' }

  const db = getDb()
  const existing = await db.select({ id: posts.id }).from(posts).where(eq(posts.slug, slug))
  if (existing.length > 0) return { ok: false, error: 'duplicate' }

  // registerTags는 멱등(onConflictDoNothing)이라 트랜잭션 밖에서 실행해도 안전하다
  const tagsResult = tags !== undefined ? await registerTags(tags) : null

  const post = await db.transaction(async (tx) => {
    const [p] = await tx
      .insert(posts)
      .values({ slug, ...(tagsResult ? { tags: tagsResult.slugs } : {}) })
      .returning()
    await tx
      .insert(postTranslations)
      .values(LANGUAGES.map((language) => ({ postId: p.id, language })))
    return p
  })

  return {
    ok: true,
    id: post.id,
    slug: post.slug,
    tags: post.tags,
    createdTags: tagsResult?.created ?? [],
  }
}

export type PostStatus = 'draft' | 'published' | 'private' | 'archived'

export interface AdminPostListItem {
  id: string
  slug: string
  status: PostStatus
  tags: string[]
  date: Date | null
  updatedAt: Date
  title: string
}

/** admin 목록용 — 제목만 필요하므로 본문 컬럼(content/compiled)은 select하지 않는다 */
export async function listAdminPosts(status?: PostStatus): Promise<AdminPostListItem[]> {
  const db = getDb()
  const [rows, translations] = await Promise.all([
    db
      .select()
      .from(posts)
      .where(status ? eq(posts.status, status) : undefined)
      .orderBy(desc(posts.updatedAt)),
    db
      .select({
        postId: postTranslations.postId,
        language: postTranslations.language,
        title: postTranslations.title,
      })
      .from(postTranslations),
  ])

  const titleByPost = new Map<string, { ko?: string; en?: string }>()
  for (const t of translations) {
    const entry = titleByPost.get(t.postId) ?? {}
    entry[t.language as Language] = t.title
    titleByPost.set(t.postId, entry)
  }

  return rows.map((post) => {
    const titles = titleByPost.get(post.id)
    return {
      id: post.id,
      slug: post.slug,
      status: post.status,
      tags: post.tags,
      date: post.date,
      updatedAt: post.updatedAt,
      title: titles?.ko || titles?.en || '(제목 없음)',
    }
  })
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
