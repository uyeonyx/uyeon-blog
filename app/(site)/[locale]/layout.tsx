import type { Metadata } from 'next'
import RootHtml from '@/components/RootHtml'
import SiteChrome from '@/components/SiteChrome'
import { TagLabelsProvider } from '@/components/TagLabelsProvider'
import siteMetadata from '@/data/siteMetadata'
import { getTagLabelMap } from '@/lib/db/tags'
import { DEFAULT_LOCALE, HTML_LANG, isLocale, OG_LOCALE } from '@/lib/i18n/config'
import { I18nProvider } from '@/lib/i18n/i18n-context'
import { localePath } from '@/lib/i18n/paths'
import { getTranslations } from '@/lib/i18n/translate'
import { absoluteUrl } from '@/lib/seo/urls'

/** 잘못된 세그먼트(`/foobar`)도 껍데기는 렌더해야 하므로 레이아웃은 관대하게 폴백한다 */
async function resolve(params: Promise<{ locale: string }>) {
  const { locale } = await params
  return isLocale(locale) ? locale : DEFAULT_LOCALE
}

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const locale = await resolve(props.params)
  const t = getTranslations(locale)
  const description = t('seo.siteDescription')
  const banner = absoluteUrl(siteMetadata.socialBanner)

  return {
    metadataBase: new URL(siteMetadata.siteUrl),
    title: {
      default: siteMetadata.title,
      template: `%s | ${siteMetadata.title}`,
    },
    description,
    openGraph: {
      title: siteMetadata.title,
      description,
      url: './',
      siteName: siteMetadata.title,
      images: [banner],
      locale: OG_LOCALE[locale],
      type: 'website',
    },
    alternates: {
      // 페이지별 절대 canonical은 genPageMetadata가 덮어쓴다 (중첩 객체는 통째 교체됨)
      canonical: './',
      types: {
        'application/rss+xml': absoluteUrl(`${localePath(locale)}/feed.xml`),
      },
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    twitter: {
      title: siteMetadata.title,
      card: 'summary_large_image',
      images: [banner],
    },
    // env 미설정 시 자동 생략된다. 한국어 비중을 감안하면 네이버 등록이 실질 트래픽에 영향이 크다.
    verification: {
      ...(process.env.GOOGLE_SITE_VERIFICATION
        ? { google: process.env.GOOGLE_SITE_VERIFICATION }
        : {}),
      ...(process.env.NAVER_SITE_VERIFICATION
        ? { other: { 'naver-site-verification': process.env.NAVER_SITE_VERIFICATION } }
        : {}),
    },
  }
}

export default async function SiteLayout(props: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const locale = await resolve(props.params)
  const tagLabels = await getTagLabelMap(locale)

  return (
    <RootHtml lang={HTML_LANG[locale]}>
      <I18nProvider locale={locale}>
        <TagLabelsProvider labels={tagLabels}>
          <SiteChrome>{props.children}</SiteChrome>
        </TagLabelsProvider>
      </I18nProvider>
    </RootHtml>
  )
}
