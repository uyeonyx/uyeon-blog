// 태그 저장 경로 단일점 — 정규화(slugify)·미등록 태그 자동 등록·사용량 집계·병합을 담당한다.
// admin API와 MCP 도구가 함께 재사용한다.
import { arrayContains, eq, inArray } from 'drizzle-orm'
import { slug as slugify } from 'github-slugger'
import { revalidateTag } from 'next/cache'
import { getDb } from '@/lib/db/client'
import { posts, projects, type TagRow, tags } from '@/lib/db/schema'

/** 원본 입력 → canonical slug. 조회 계층(lib/db/posts.ts)의 slugify와 동일 규칙 */
export function normalizeTag(raw: string): string {
  return slugify(raw.trim())
}

export interface RegisterTagsResult {
  /** canonical slug 배열 — 중복 제거, 입력 순서 유지 */
  slugs: string[]
  /** 이번 호출로 새로 등록된 slug (라벨은 원본 문자열로 초기화) */
  created: string[]
}

/**
 * 태그 배열을 정규화하고 마스터에 없는 태그는 자동 등록한다.
 * 캐시 무효화는 호출자 책임 — MCP는 요청 내 revalidateTag가 유실되므로 mcpRevalidateTag를 쓴다.
 */
export async function registerTags(raw: string[]): Promise<RegisterTagsResult> {
  const seen = new Set<string>()
  const entries: { slug: string; label: string }[] = []
  for (const value of raw) {
    const label = String(value).trim()
    const slug = normalizeTag(label)
    if (!slug || seen.has(slug)) continue
    seen.add(slug)
    entries.push({ slug, label })
  }
  if (entries.length === 0) return { slugs: [], created: [] }

  const db = getDb()
  const existing = await db
    .select({ slug: tags.slug })
    .from(tags)
    .where(
      inArray(
        tags.slug,
        entries.map((e) => e.slug)
      )
    )
  const known = new Set(existing.map((e) => e.slug))
  const missing = entries.filter((e) => !known.has(e.slug))
  if (missing.length > 0) {
    await db
      .insert(tags)
      .values(missing.map((m) => ({ slug: m.slug, labelKo: m.label, labelEn: m.label })))
      .onConflictDoNothing()
  }
  return { slugs: entries.map((e) => e.slug), created: missing.map((m) => m.slug) }
}

/** 태그 마스터 캐시 무효화 — 라벨/목록 mutation 후 호출 (즉시 만료) */
export function revalidateTagMaster() {
  revalidateTag('tags', { expire: 0 })
}

export interface TagUsage {
  slug: string
  labelKo: string
  labelEn: string
  postCount: number
  projectCount: number
  /** 마스터에 등록된 태그인지 — false면 콘텐츠에만 존재 (마이그레이션 전 데이터 등) */
  registered: boolean
}

/** admin용 태그 목록 — 전 상태(draft 포함) 콘텐츠의 사용량 집계 포함 */
export async function listTagUsage(): Promise<TagUsage[]> {
  const db = getDb()
  const [master, postRows, projectRows] = await Promise.all([
    db.select().from(tags),
    db.select({ tags: posts.tags }).from(posts),
    db.select({ tags: projects.tags }).from(projects),
  ])

  const countBySlug = (rows: { tags: string[] }[]) => {
    const counts: Record<string, number> = {}
    for (const row of rows) {
      // 행당 1회 카운트 — 과거 데이터 표기 흔들림 대비 slugify로 방어 정규화
      const unique = new Set(row.tags.map(normalizeTag).filter(Boolean))
      for (const slug of unique) counts[slug] = (counts[slug] ?? 0) + 1
    }
    return counts
  }
  const postCounts = countBySlug(postRows)
  const projectCounts = countBySlug(projectRows)

  const bySlug = new Map<string, TagUsage>()
  for (const row of master) {
    bySlug.set(row.slug, {
      slug: row.slug,
      labelKo: row.labelKo,
      labelEn: row.labelEn,
      postCount: postCounts[row.slug] ?? 0,
      projectCount: projectCounts[row.slug] ?? 0,
      registered: true,
    })
  }
  for (const slug of [...Object.keys(postCounts), ...Object.keys(projectCounts)]) {
    if (bySlug.has(slug)) continue
    bySlug.set(slug, {
      slug,
      labelKo: slug,
      labelEn: slug,
      postCount: postCounts[slug] ?? 0,
      projectCount: projectCounts[slug] ?? 0,
      registered: false,
    })
  }
  return [...bySlug.values()].sort(
    (a, b) =>
      b.postCount + b.projectCount - (a.postCount + a.projectCount) || a.slug.localeCompare(b.slug)
  )
}

export type RenameTagResult =
  | { ok: true; merged: boolean; postCount: number; projectCount: number }
  | { ok: false; error: 'not_found' | 'invalid_slug' | 'same_slug' }

/**
 * 태그 rename/병합 — 콘텐츠 배열의 oldSlug를 newSlug로 치환한다.
 * newSlug가 이미 마스터에 있으면 병합(옛 행 삭제), 없으면 slug 이동(라벨 유지).
 * 배열 rewrite를 먼저, 마스터 정리를 나중에 수행해 중간 실패 시 재실행해도 안전하다.
 */
export async function renameTag(oldSlug: string, newSlugRaw: string): Promise<RenameTagResult> {
  const newSlug = normalizeTag(newSlugRaw)
  if (!newSlug) return { ok: false, error: 'invalid_slug' }
  if (newSlug === oldSlug) return { ok: false, error: 'same_slug' }

  const db = getDb()
  const [oldRow] = await db.select().from(tags).where(eq(tags.slug, oldSlug))
  if (!oldRow) return { ok: false, error: 'not_found' }
  const [newRow] = await db.select().from(tags).where(eq(tags.slug, newSlug))

  const replaceSlug = (current: string[]) => {
    const next: string[] = []
    for (const t of current) {
      const mapped = t === oldSlug ? newSlug : t
      if (!next.includes(mapped)) next.push(mapped)
    }
    return next
  }

  const postRows = await db
    .select({ id: posts.id, tags: posts.tags })
    .from(posts)
    .where(arrayContains(posts.tags, [oldSlug]))
  for (const row of postRows) {
    await db
      .update(posts)
      .set({ tags: replaceSlug(row.tags), updatedAt: new Date() })
      .where(eq(posts.id, row.id))
  }

  const projectRows = await db
    .select({ id: projects.id, tags: projects.tags })
    .from(projects)
    .where(arrayContains(projects.tags, [oldSlug]))
  for (const row of projectRows) {
    await db
      .update(projects)
      .set({ tags: replaceSlug(row.tags), updatedAt: new Date() })
      .where(eq(projects.id, row.id))
  }

  const postCount = postRows.length
  const projectCount = projectRows.length

  if (newRow) {
    // 병합 — 새 slug의 기존 라벨 유지, 옛 행 삭제
    await db.delete(tags).where(eq(tags.slug, oldSlug))
  } else {
    // slug 이동 — 라벨 유지
    await db
      .update(tags)
      .set({ slug: newSlug, updatedAt: new Date() })
      .where(eq(tags.slug, oldSlug))
  }
  return { ok: true, merged: !!newRow, postCount, projectCount }
}

export async function updateTagLabels(
  slug: string,
  input: { labelKo?: string; labelEn?: string }
): Promise<TagRow | null> {
  const db = getDb()
  const [row] = await db
    .update(tags)
    .set({
      ...(input.labelKo !== undefined ? { labelKo: input.labelKo } : {}),
      ...(input.labelEn !== undefined ? { labelEn: input.labelEn } : {}),
      updatedAt: new Date(),
    })
    .where(eq(tags.slug, slug))
    .returning()
  return row ?? null
}
