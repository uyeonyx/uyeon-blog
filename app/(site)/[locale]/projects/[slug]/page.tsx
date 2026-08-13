import 'css/prism.css'

import { genPageMetadata } from 'app/seo'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import JsonLd from '@/components/JsonLd'
import ProjectDetail from '@/components/ProjectDetail'
import { getProjectLocales, getPublishedProject, getPublishedProjects } from '@/lib/db/projects'
import { isLocale } from '@/lib/i18n/config'
import { assertLocale } from '@/lib/i18n/route'
import { getTranslations } from '@/lib/i18n/translate'
import { breadcrumbJsonLd } from '@/lib/seo/jsonld'
import { localeUrl } from '@/lib/seo/urls'

// ISR 필수 조건 — generateStaticParams가 있어야 요청 시 렌더 결과가 캐시된다
export async function generateStaticParams({ params }: { params: { locale: string } }) {
  const { locale } = params
  if (!isLocale(locale)) return []
  return (await getPublishedProjects(locale)).map((p) => ({ slug: p.slug }))
}

async function resolve(params: Promise<{ locale: string; slug: string }>) {
  const { locale, slug } = await params
  return { locale: assertLocale(locale), slug: decodeURIComponent(slug) }
}

export async function generateMetadata(props: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata | undefined> {
  const { locale, slug } = await resolve(props.params)
  const project = await getPublishedProject(slug, locale)
  if (!project) return

  const available = await getProjectLocales(slug)
  return genPageMetadata({
    locale,
    seg: `projects/${slug}`,
    title: project.title,
    description: project.description,
    ...(project.imgSrc ? { image: project.imgSrc } : {}),
    availableLocales: available,
  })
}

export default async function ProjectPage(props: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await resolve(props.params)
  const project = await getPublishedProject(slug, locale)
  if (!project) notFound()

  const t = getTranslations(locale)
  return (
    <>
      {/* 본문에 수식이 있을 때만 katex CSS (blog 상세와 동일 패턴) */}
      {project.body.code.includes('katex') && (
        <link rel="stylesheet" href="/static/katex/katex.min.css" precedence="high" />
      )}
      <JsonLd
        data={breadcrumbJsonLd([
          { name: t('common.home'), url: localeUrl(locale) },
          { name: t('pages.projects.title'), url: localeUrl(locale, 'projects') },
          { name: project.title, url: localeUrl(locale, `projects/${slug}`) },
        ])}
      />
      <ProjectDetail project={project} locale={locale} />
    </>
  )
}
