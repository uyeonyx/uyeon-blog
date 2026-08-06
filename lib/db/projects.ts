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
