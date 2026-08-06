// 공개 페이지용 프로젝트 조회 — 'projects' 태그로 캐시, mutation 시 revalidateTag('projects')
import { asc, eq, inArray } from 'drizzle-orm'
import { unstable_cache } from 'next/cache'
import type { Project } from '@/lib/types/project'
import { getDb } from './client'
import { projects, projectTranslations } from './schema'

const loadPublishedProjects = unstable_cache(
  async (): Promise<Project[]> => {
    const db = getDb()
    const rows = await db
      .select()
      .from(projects)
      .where(eq(projects.published, true))
      .orderBy(asc(projects.displayOrder), asc(projects.slug))
    if (rows.length === 0) return []
    const translations = await db
      .select()
      .from(projectTranslations)
      .where(
        inArray(
          projectTranslations.projectId,
          rows.map((r) => r.id)
        )
      )

    const result: Project[] = []
    for (const project of rows) {
      for (const tr of translations.filter((t) => t.projectId === project.id)) {
        if (!tr.compiledCode || !tr.title.trim()) continue
        result.push({
          slug: project.slug,
          language: tr.language,
          title: tr.title,
          description: tr.description,
          imgSrc: project.imgSrc ?? undefined,
          href: project.href ?? undefined,
          period: tr.period ?? undefined,
          role: tr.role ?? undefined,
          company: tr.company ?? undefined,
          tags: project.tags,
          body: { code: tr.compiledCode },
        })
      }
    }
    return result
  },
  ['published-projects'],
  { tags: ['projects'] }
)

/** 양 언어 전부 반환 — 클라이언트에서 locale 필터 (기존 allProjects 소비 패턴) */
export async function getPublishedProjects(): Promise<Project[]> {
  return loadPublishedProjects()
}

/** 공개 MCP용 상세 마크다운 — published만 SQL 레벨에서 필터 */
export interface PublishedProjectMarkdown {
  slug: string
  tags: string[]
  href?: string
  imgSrc?: string
  translations: Partial<
    Record<
      'ko' | 'en',
      {
        title: string
        description: string
        period?: string
        role?: string
        company?: string
        markdown: string
      }
    >
  >
}

const loadPublishedProjectMarkdown = unstable_cache(
  async (): Promise<PublishedProjectMarkdown[]> => {
    const db = getDb()
    const rows = await db
      .select()
      .from(projects)
      .where(eq(projects.published, true))
      .orderBy(asc(projects.displayOrder), asc(projects.slug))
    if (rows.length === 0) return []
    const translations = await db
      .select()
      .from(projectTranslations)
      .where(
        inArray(
          projectTranslations.projectId,
          rows.map((r) => r.id)
        )
      )

    const result: PublishedProjectMarkdown[] = []
    for (const project of rows) {
      const item: PublishedProjectMarkdown = {
        slug: project.slug,
        tags: project.tags,
        href: project.href ?? undefined,
        imgSrc: project.imgSrc ?? undefined,
        translations: {},
      }
      for (const tr of translations.filter((t) => t.projectId === project.id)) {
        if (!tr.compiledCode || !tr.title.trim()) continue
        item.translations[tr.language as 'ko' | 'en'] = {
          title: tr.title,
          description: tr.description,
          period: tr.period ?? undefined,
          role: tr.role ?? undefined,
          company: tr.company ?? undefined,
          markdown: tr.contentMd,
        }
      }
      if (Object.keys(item.translations).length > 0) result.push(item)
    }
    return result
  },
  ['published-projects-markdown'],
  { tags: ['projects'] }
)

/** 공개 project_get용 — published가 아니면 null */
export async function getPublishedProjectMarkdown(
  slug: string
): Promise<PublishedProjectMarkdown | null> {
  return (await loadPublishedProjectMarkdown()).find((p) => p.slug === slug) ?? null
}

/** 공개 projects_list·llms.txt용 — 전체 published 프로젝트 (표시 순서) */
export async function getAllPublishedProjectMarkdown(): Promise<PublishedProjectMarkdown[]> {
  return loadPublishedProjectMarkdown()
}
