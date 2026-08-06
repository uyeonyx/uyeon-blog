import { genPageMetadata } from 'app/seo'
import type { Metadata } from 'next'
import { getPublishedProjects } from '@/lib/db/projects'
import { assertLocale } from '@/lib/i18n/route'
import { getTranslations } from '@/lib/i18n/translate'
import ProjectsPageClient from './ProjectsPageClient'

// DB 조회 페이지 — 요청 시 렌더 (데이터는 'projects' 태그로 캐시됨)
export const dynamic = 'force-dynamic'

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const locale = assertLocale((await props.params).locale)
  const t = getTranslations(locale)
  return genPageMetadata({
    locale,
    seg: 'projects',
    title: t('pages.projects.title'),
    description: t('pages.projects.description'),
  })
}

export default async function Projects(props: { params: Promise<{ locale: string }> }) {
  const locale = assertLocale((await props.params).locale)
  const projects = await getPublishedProjects(locale)
  return <ProjectsPageClient projects={projects} />
}
