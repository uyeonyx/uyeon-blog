import { genPageMetadata } from 'app/seo'
import type { Metadata } from 'next'
import JsonLd from '@/components/JsonLd'
import siteMetadata from '@/data/siteMetadata'
import { getAuthorCore } from '@/lib/db/authors'
import { getPublishedCores } from '@/lib/db/posts'
import { assertLocale } from '@/lib/i18n/route'
import { getTranslations } from '@/lib/i18n/translate'
import { siteGraphJsonLd } from '@/lib/seo/jsonld'
import Main from './Main'

// DB 조회 페이지 — 빌드 타임 프리렌더 대신 요청 시 렌더 (데이터는 'posts' 태그로 캐시됨)
export const dynamic = 'force-dynamic'

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const locale = assertLocale((await props.params).locale)
  const t = getTranslations(locale)
  return genPageMetadata({
    locale,
    seg: '',
    title: siteMetadata.title,
    absoluteTitle: true,
    description: t('seo.siteDescription'),
    rssSeg: 'feed.xml',
  })
}

export default async function Page(props: { params: Promise<{ locale: string }> }) {
  const locale = assertLocale((await props.params).locale)
  const t = getTranslations(locale)
  const [posts, author] = await Promise.all([getPublishedCores(locale), getAuthorCore(locale)])

  return (
    <>
      <JsonLd data={siteGraphJsonLd(locale, author, t('seo.siteDescription'))} />
      <Main posts={posts} />
    </>
  )
}
