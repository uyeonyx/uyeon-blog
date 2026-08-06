import { genPageMetadata } from 'app/seo'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import JsonLd from '@/components/JsonLd'
import { getAuthor } from '@/lib/db/authors'
import { assertLocale } from '@/lib/i18n/route'
import { getTranslations } from '@/lib/i18n/translate'
import { profilePageJsonLd } from '@/lib/seo/jsonld'
import AboutPageClient from './AboutPageClient'

// DB 조회 페이지 — 요청 시 렌더 (데이터는 'authors' 태그로 캐시됨)
export const dynamic = 'force-dynamic'

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const locale = assertLocale((await props.params).locale)
  const t = getTranslations(locale)
  return genPageMetadata({
    locale,
    seg: 'about',
    title: t('pages.about.title'),
    description: t('seo.aboutDescription'),
  })
}

export default async function Page(props: { params: Promise<{ locale: string }> }) {
  const locale = assertLocale((await props.params).locale)
  const author = await getAuthor(locale, 'default')
  if (!author) notFound()

  const { techStack: _t, timeline: _tl, body: _b, ...core } = author
  return (
    <>
      <JsonLd data={profilePageJsonLd(locale, core)} />
      <AboutPageClient author={author} />
    </>
  )
}
