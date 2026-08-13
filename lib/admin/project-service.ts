import { asc, eq, isNotNull } from 'drizzle-orm'
import { revalidateTag } from 'next/cache'
import { getDb } from '@/lib/db/client'
import { projects, projectTranslations } from '@/lib/db/schema'
import { smartQuotes } from '@/lib/utils'
import { prepareContent } from './content-compile'
import { type CompileResult, LANGUAGES, type Language, SLUG_PATTERN } from './post-service'
import { registerTags } from './tag-service'

export interface ProjectTranslationInput {
  title: string
  description?: string | null
  period?: string | null
  role?: string | null
  company?: string | null
  // biome-ignore lint/suspicious/noExplicitAny: Tiptap JSON 문서
  contentJson: any
}

export interface ProjectMetaInput {
  slug?: string
  published?: boolean
  displayOrder?: number
  imgSrc?: string | null
  href?: string | null
  tags?: string[]
}

/** admin 목록용 — published 여부 무관 전체, displayOrder 순. 본문 컬럼은 select하지 않는다 */
export async function listProjects() {
  const db = getDb()
  const [rows, translations] = await Promise.all([
    db.select().from(projects).orderBy(asc(projects.displayOrder), asc(projects.slug)),
    db
      .select({
        projectId: projectTranslations.projectId,
        language: projectTranslations.language,
        title: projectTranslations.title,
        compiledOk: isNotNull(projectTranslations.compiledCode).mapWith(Boolean),
      })
      .from(projectTranslations),
  ])

  const byProject = new Map<
    string,
    { ko?: { title: string; compiledOk: boolean }; en?: { title: string; compiledOk: boolean } }
  >()
  for (const t of translations) {
    const entry = byProject.get(t.projectId) ?? {}
    entry[t.language as Language] = { title: t.title, compiledOk: t.compiledOk }
    byProject.set(t.projectId, entry)
  }

  return rows.map((project) => {
    const trs = byProject.get(project.id)
    return {
      id: project.id,
      slug: project.slug,
      published: project.published,
      displayOrder: project.displayOrder,
      tags: project.tags,
      updatedAt: project.updatedAt,
      title: trs?.ko?.title || trs?.en?.title || '(제목 없음)',
      compileOk: {
        ko: Boolean(trs?.ko?.compiledOk),
        en: Boolean(trs?.en?.compiledOk),
      },
    }
  })
}

export type CreateProjectResult =
  | { ok: true; id: string; slug: string }
  | { ok: false; error: 'invalid_slug' | 'duplicate' }

/** 프로젝트 생성 + 양 언어 빈 translation 행 생성 (posts POST 패턴) */
export async function createProject(slug: string): Promise<CreateProjectResult> {
  const trimmed = slug.trim()
  if (!SLUG_PATTERN.test(trimmed)) return { ok: false, error: 'invalid_slug' }

  const db = getDb()
  const existing = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.slug, trimmed))
  if (existing.length > 0) return { ok: false, error: 'duplicate' }

  // 두 INSERT를 한 트랜잭션으로 — 중간 실패 시 번역 행 없는 고아 프로젝트가 남지 않게
  const row = await db.transaction(async (tx) => {
    const [p] = await tx.insert(projects).values({ slug: trimmed }).returning()
    await tx
      .insert(projectTranslations)
      .values(LANGUAGES.map((language) => ({ projectId: p.id, language })))
    return p
  })
  return { ok: true, id: row.id, slug: row.slug }
}

export async function getProjectForEdit(id: string) {
  const db = getDb()
  const [project] = await db.select().from(projects).where(eq(projects.id, id))
  if (!project) return null
  const translations = await db
    .select()
    .from(projectTranslations)
    .where(eq(projectTranslations.projectId, id))
  return { project, translations }
}

export type UpdateProjectMetaResult =
  | { ok: true; createdTags: string[] }
  | { ok: false; error: 'not_found' | 'invalid_slug' | 'duplicate' }

export async function updateProjectMeta(
  id: string,
  input: ProjectMetaInput
): Promise<UpdateProjectMetaResult> {
  const db = getDb()
  const [existing] = await db.select().from(projects).where(eq(projects.id, id))
  if (!existing) return { ok: false, error: 'not_found' }

  if (input.slug !== undefined && input.slug !== existing.slug) {
    const slug = input.slug.trim()
    if (!SLUG_PATTERN.test(slug)) return { ok: false, error: 'invalid_slug' }
    const dup = await db.select({ id: projects.id }).from(projects).where(eq(projects.slug, slug))
    if (dup.length > 0) return { ok: false, error: 'duplicate' }
  }

  // 태그는 canonical slug로 정규화해 저장, 미등록 태그는 마스터에 자동 등록
  const tagsResult = input.tags !== undefined ? await registerTags(input.tags) : null

  await db
    .update(projects)
    .set({
      ...(input.slug !== undefined ? { slug: input.slug.trim() } : {}),
      ...(input.published !== undefined ? { published: input.published } : {}),
      ...(input.displayOrder !== undefined ? { displayOrder: input.displayOrder } : {}),
      ...(input.imgSrc !== undefined ? { imgSrc: input.imgSrc || null } : {}),
      ...(input.href !== undefined ? { href: input.href || null } : {}),
      ...(tagsResult ? { tags: tagsResult.slugs } : {}),
      updatedAt: new Date(),
    })
    .where(eq(projects.id, id))
  return { ok: true, createdTags: tagsResult?.created ?? [] }
}

/**
 * 번역 1건 저장 + 컴파일 — 실패해도 원본은 저장 (posts saveTranslation과 동일 계약)
 * upsert — 번역 행이 유실됐어도 저장이 조용히 no-op되지 않는다.
 */
export async function saveProjectTranslation(
  projectId: string,
  language: Language,
  input: ProjectTranslationInput
): Promise<CompileResult> {
  const db = getDb()
  const prepared = await prepareContent(input.contentJson)

  const values = {
    projectId,
    language,
    title: smartQuotes(input.title ?? ''),
    description: input.description ? smartQuotes(input.description) : '',
    period: input.period || null,
    role: input.role || null,
    company: input.company || null,
    contentJson: input.contentJson ?? null,
    contentMd: prepared.contentMd,
    compiledCode: prepared.compiledCode,
    compiledAt: prepared.compiledAt,
  }
  await db
    .insert(projectTranslations)
    .values(values)
    .onConflictDoUpdate({
      target: [projectTranslations.projectId, projectTranslations.language],
      set: {
        title: values.title,
        description: values.description,
        period: values.period,
        role: values.role,
        company: values.company,
        contentJson: values.contentJson,
        contentMd: values.contentMd,
        compiledCode: values.compiledCode,
        compiledAt: values.compiledAt,
      },
    })

  return { language, ok: !prepared.error, error: prepared.error ?? undefined }
}

export async function deleteProject(id: string): Promise<boolean> {
  const db = getDb()
  const deleted = await db.delete(projects).where(eq(projects.id, id)).returning()
  return deleted.length > 0
}

export async function touchProject(id: string) {
  const db = getDb()
  await db.update(projects).set({ updatedAt: new Date() }).where(eq(projects.id, id))
}

/** 공개 페이지 캐시 무효화 — 모든 mutation 후 호출 */
export function revalidateProjects() {
  revalidateTag('projects', { expire: 0 })
}
