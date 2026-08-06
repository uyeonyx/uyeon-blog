import type { Metadata } from 'next'
import siteMetadata from '@/data/siteMetadata'
import { LOCALES, type Locale, OG_LOCALE } from '@/lib/i18n/config'
import { absoluteUrl, hreflangMap, localeUrl } from '@/lib/seo/urls'

interface PageSeoInput extends Omit<Partial<Metadata>, 'alternates' | 'title'> {
  locale: Locale
  /** 로케일 접두사를 뺀 경로. '' | 'blog' | 'tags/react' | 'blog/page/2' */
  seg: string
  title: string
  /** 홈처럼 "제목 | 사이트명" 템플릿을 적용하지 않아야 하는 페이지 */
  absoluteTitle?: boolean
  description?: string
  image?: string
  /** 이 경로가 실제로 존재하는 언어 (한쪽 언어에만 있는 글 등) */
  availableLocales?: readonly Locale[]
  /** 페이지네이션처럼 언어 간 대응관계가 성립하지 않는 경로는 hreflang을 생략한다 */
  noHreflang?: boolean
  /** 로케일 접두사를 뺀 RSS 경로. 'feed.xml' | 'tags/react/feed.xml' */
  rssSeg?: string
  ogType?: 'website' | 'article'
  /** 글 상세 — og:type=article의 부가 필드 */
  article?: { publishedTime: string; modifiedTime: string; authors: string[] }
}

/**
 * 페이지 메타데이터 팩토리.
 *
 * alternates를 통째로 여기서 만든다 — Metadata는 세그먼트 간 shallow merge라
 * 자식이 alternates를 건드리는 순간 레이아웃의 RSS types가 사라지기 때문이다.
 */
export function genPageMetadata({
  locale,
  seg,
  title,
  absoluteTitle,
  description,
  image,
  availableLocales = LOCALES,
  noHreflang,
  rssSeg,
  article,
  ogType = article ? 'article' : 'website',
  ...rest
}: PageSeoInput): Metadata {
  const canonical = localeUrl(locale, seg)
  const desc = description || siteMetadata.description
  const images = [image ? absoluteUrl(image) : absoluteUrl(siteMetadata.socialBanner)]
  const alternateLocale = availableLocales.filter((l) => l !== locale).map((l) => OG_LOCALE[l])
  const fullTitle = absoluteTitle ? title : `${title} | ${siteMetadata.title}`

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description: desc,
    openGraph: {
      title: fullTitle,
      description: desc,
      url: canonical,
      siteName: siteMetadata.title,
      images,
      locale: OG_LOCALE[locale],
      alternateLocale,
      ...(article
        ? {
            type: 'article' as const,
            publishedTime: article.publishedTime,
            modifiedTime: article.modifiedTime,
            authors: article.authors,
          }
        : { type: ogType }),
    },
    twitter: {
      title: fullTitle,
      card: 'summary_large_image',
      images,
    },
    alternates: {
      canonical,
      languages: noHreflang ? undefined : hreflangMap(seg, availableLocales),
      types: rssSeg ? { 'application/rss+xml': localeUrl(locale, rssSeg) } : undefined,
    },
    ...rest,
  }
}
