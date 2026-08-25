import {
  and,
  count,
  desc,
  eq,
  exists,
  ilike,
  inArray,
  isNotNull,
  or,
  type SQL,
  sql,
} from 'drizzle-orm'
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
  /** 본문이 그대로라 MDX 컴파일을 건너뛴 경우 */
  skipped?: boolean
}

/**
 * 본문이 바뀌지 않았을 때 쓰는 옵션. MDX 컴파일(esbuild)은 언어당 수 초가 들기 때문에
 * 제목만 고치는 요청에서까지 도는 것을 막는다. `compiledOk`는 기존 행의 컴파일 상태(보고용).
 */
export interface KeepContentOption {
  compiledOk: boolean
}

/**
 * 번역 1건 저장 + 컴파일. 컴파일 실패해도 원본(JSON/MD)은 저장하고 결과만 보고한다.
 * upsert — 번역 행이 유실됐어도 저장이 조용히 no-op되지 않는다. postId가 없으면 FK 위반으로 명시적 실패.
 *
 * `opts.keepContent`를 주면 본문 컬럼을 아예 건드리지 않는다 (컴파일도 생략).
 */
export async function saveTranslation(
  postId: string,
  language: Language,
  input: TranslationInput,
  opts?: { keepContent?: KeepContentOption }
): Promise<CompileResult> {
  const db = getDb()
  const meta = {
    title: smartQuotes(input.title ?? ''),
    summary: input.summary ? smartQuotes(input.summary) : null,
  }

  if (opts?.keepContent) {
    // 본문 컬럼은 values/set 양쪽에서 뺀다 — 스키마상 content_md는 default ''라 INSERT 생략이 안전하다.
    await db
      .insert(postTranslations)
      .values({ postId, language, ...meta })
      .onConflictDoUpdate({
        target: [postTranslations.postId, postTranslations.language],
        set: meta,
      })
    return { language, ok: opts.keepContent.compiledOk, skipped: true }
  }

  const prepared = await prepareContent(input.contentJson)

  const values = {
    postId,
    language,
    ...meta,
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

export interface PostSummary {
  id: string
  slug: string
  status: PostStatus
  tags: string[]
  date: Date | null
  updatedAt: Date
  title: { ko: string; en: string }
  compileOk: { ko: boolean; en: boolean }
}

export interface ListPostSummariesOptions {
  status?: PostStatus
  /** slug 또는 어느 언어 제목이든 부분 일치 (대소문자 무시) */
  q?: string
  limit?: number
  offset?: number
}

/** LIKE 와일드카드를 리터럴로 — 사용자 입력이 패턴으로 해석되지 않게 */
function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`)
}

/**
 * MCP posts_list용 — 페이지 하나에 해당하는 요약만.
 * `content_json`/`content_md`/`compiled_code`는 절대 select하지 않는다: 제목과 컴파일 여부만
 * 쓰는데 본문·번들 전체를 끌어오면 글 수에 비례해 수 MB가 오간다.
 */
export async function listPostSummaries({
  status,
  q,
  limit = 20,
  offset = 0,
}: ListPostSummariesOptions = {}): Promise<{ items: PostSummary[]; total: number }> {
  const db = getDb()
  const filters: Array<SQL | undefined> = []
  if (status) filters.push(eq(posts.status, status))
  if (q?.trim()) {
    const pattern = `%${escapeLike(q.trim())}%`
    filters.push(
      or(
        ilike(posts.slug, pattern),
        exists(
          db
            .select({ one: sql`1` })
            .from(postTranslations)
            .where(
              and(eq(postTranslations.postId, posts.id), ilike(postTranslations.title, pattern))
            )
        )
      )
    )
  }
  const where = filters.length > 0 ? and(...filters) : undefined

  const [[totalRow], rows] = await Promise.all([
    db.select({ total: count() }).from(posts).where(where),
    db
      .select({
        id: posts.id,
        slug: posts.slug,
        status: posts.status,
        tags: posts.tags,
        date: posts.date,
        updatedAt: posts.updatedAt,
      })
      .from(posts)
      .where(where)
      .orderBy(desc(posts.updatedAt))
      .limit(limit)
      .offset(offset),
  ])

  const total = totalRow?.total ?? 0
  if (rows.length === 0) return { items: [], total }

  const translations = await db
    .select({
      postId: postTranslations.postId,
      language: postTranslations.language,
      title: postTranslations.title,
      // 빈 본문은 "컴파일할 게 없음"이므로 ok로 친다 (기존 판정과 동일)
      compileOk: sql<boolean>`(${postTranslations.compiledCode} IS NOT NULL OR btrim(${postTranslations.contentMd}) = '')`,
    })
    .from(postTranslations)
    .where(
      inArray(
        postTranslations.postId,
        rows.map((r) => r.id)
      )
    )

  const byPost = new Map<string, Partial<Record<Language, { title: string; compileOk: boolean }>>>()
  for (const t of translations) {
    const entry = byPost.get(t.postId) ?? {}
    entry[t.language as Language] = { title: t.title, compileOk: t.compileOk }
    byPost.set(t.postId, entry)
  }

  const items = rows.map((post) => {
    const trs = byPost.get(post.id)
    return {
      ...post,
      title: { ko: trs?.ko?.title ?? '', en: trs?.en?.title ?? '' },
      compileOk: { ko: Boolean(trs?.ko?.compileOk), en: Boolean(trs?.en?.compileOk) },
    }
  })
  return { items, total }
}

/** 게시 가능 여부: 양 언어 모두 제목과 컴파일 성공한 본문 필요 */
export async function validatePublishable(postId: string): Promise<string[]> {
  const db = getDb()
  // 판정에 본문 문자열 자체는 필요 없다 — 비었는지/컴파일됐는지만 SQL에서 계산한다
  const translations = await db
    .select({
      language: postTranslations.language,
      title: postTranslations.title,
      hasBody: sql<boolean>`btrim(${postTranslations.contentMd}) <> ''`,
      compiled: isNotNull(postTranslations.compiledCode).mapWith(Boolean),
    })
    .from(postTranslations)
    .where(eq(postTranslations.postId, postId))

  const problems: string[] = []
  for (const lang of LANGUAGES) {
    const tr = translations.find((t) => t.language === lang)
    if (!tr || !tr.title.trim()) {
      problems.push(`${lang}: 제목이 비어 있습니다`)
      continue
    }
    if (!tr.hasBody) {
      problems.push(`${lang}: 본문이 비어 있습니다`)
      continue
    }
    if (!tr.compiled) {
      // 컴파일 에러 원문은 저장하지 않으므로, 원인을 얻는 가장 값싼 다음 행동을 알려준다
      problems.push(
        `${lang}: 본문 컴파일에 실패한 상태입니다 — post_update로 ${lang} 본문을 다시 저장하면 응답 compileResults에 원인이 나옵니다`
      )
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
