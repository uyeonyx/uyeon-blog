import type { Metadata } from 'next'
import RootHtml from '@/components/RootHtml'
import SiteChrome from '@/components/SiteChrome'
import { TagLabelsProvider } from '@/components/TagLabelsProvider'
import siteMetadata from '@/data/siteMetadata'
import { getTagLabelMap } from '@/lib/db/tags'
import { DEFAULT_LOCALE, HTML_LANG, isLocale, LOCALES, OG_LOCALE } from '@/lib/i18n/config'
import { I18nProvider } from '@/lib/i18n/i18n-context'
import { localePath } from '@/lib/i18n/paths'
import { getTranslations } from '@/lib/i18n/translate'
import { absoluteUrl } from '@/lib/seo/urls'

// 로케일 세그먼트를 정적으로 열거해야 하위 라우트가 ISR(요청 시 렌더 후 캐시)로 동작한다.
// 데이터는 전부 unstable_cache + revalidateTag라서 mutation 시 라우트 캐시까지 함께 퍼지된다.
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }))
}

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
  // 레이아웃의 에러는 하위 error.tsx가 못 잡는다(경계가 레이아웃 안쪽) — DB 장애 시
  // 스타일 없는 기본 에러 화면 대신, 라벨만 비우고 껍데기는 살린다 (소비처는 slug 폴백)
  const tagLabels = await getTagLabelMap(locale).catch(() => ({}) as Record<string, string>)

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
