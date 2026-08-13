import { genPageMetadata } from 'app/seo'
import type { Metadata } from 'next'
import JsonLd from '@/components/JsonLd'
import { getPublishedProjects } from '@/lib/db/projects'
import { assertLocale } from '@/lib/i18n/route'
import { getTranslations } from '@/lib/i18n/translate'
import { breadcrumbJsonLd, collectionPageJsonLd } from '@/lib/seo/jsonld'
import { localeUrl } from '@/lib/seo/urls'
import ProjectsPageClient from '../ProjectsPageClient'

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
  const t = getTranslations(locale)
  const projects = await getPublishedProjects(locale)
  const url = localeUrl(locale, 'projects')

  return (
    <>
      <JsonLd
        data={collectionPageJsonLd({
          locale,
          url,
          name: t('pages.projects.title'),
          description: t('pages.projects.description'),
          items: projects.map((p) => ({
            name: p.title,
            url: localeUrl(locale, `projects/${p.slug}`),
          })),
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: t('common.home'), url: localeUrl(locale) },
          { name: t('pages.projects.title'), url },
        ])}
      />
      {/* 목록에는 본문(body)을 내려보내지 않는다 — RSC 페이로드 절감 */}
      <ProjectsPageClient projects={projects.map(({ body: _body, ...core }) => core)} />
    </>
  )
}
