import { genPageMetadata } from 'app/seo'
import type { Metadata } from 'next'
import { getPublishedProjects } from '@/lib/db/projects'
import { assertLocale } from '@/lib/i18n/route'
import { getTranslations } from '@/lib/i18n/translate'
import ProjectsPageClient from './ProjectsPageClient'

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
  // 목록에는 본문(body)을 내려보내지 않는다 — RSC 페이로드 절감
  return <ProjectsPageClient projects={projects.map(({ body: _body, ...core }) => core)} />
}
