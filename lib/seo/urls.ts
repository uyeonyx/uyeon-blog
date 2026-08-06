import siteMetadata from '@/data/siteMetadata'
import { BCP47, DEFAULT_LOCALE, LOCALES, type Locale } from '@/lib/i18n/config'
import { localePath } from '@/lib/i18n/paths'

/**
 * 상대경로를 절대 URL로. Metadata API의 metadataBase와 동일한 해석 규칙(`new URL(p, base)`)을
 * 재현하므로, metadataBase가 적용되지 않는 소비자(JSON-LD·sitemap·RSS·OG 라우트·MCP)의
 * 출력이 메타데이터와 원리적으로 일치한다.
 */
export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  return new URL(pathOrUrl, siteMetadata.siteUrl).toString()
}

export function localeUrl(locale: Locale, seg = ''): string {
  return absoluteUrl(localePath(locale, seg))
}

/**
 * hreflang 맵. Next는 self-reference를 자동으로 넣어주지 않는데 Google은 상호참조를
 * 요구하므로 자기 자신을 포함시킨다. x-default는 무접두사 URL이 308로 향하는 곳(=ko).
 */
export function hreflangMap(
  seg: string,
  available: readonly Locale[] = LOCALES
): Record<string, string> {
  const map: Record<string, string> = {}
  for (const locale of available) {
    map[BCP47[locale]] = localeUrl(locale, seg)
  }
  const fallback = available.includes(DEFAULT_LOCALE) ? DEFAULT_LOCALE : available[0]
  if (fallback) map['x-default'] = localeUrl(fallback, seg)
  return map
}

/**
 * 글의 대표 이미지 URL 하나를 결정한다. generateMetadata와 JSON-LD가 같은 답을 쓰도록 단일화.
 * 커버가 없으면 동적 OG 라우트로 폴백한다.
 */
export function postImageUrl(post: { slug: string; images?: string[] }, locale: Locale): string {
  const cover = post.images?.[0]
  return cover ? absoluteUrl(cover) : absoluteUrl(`/og/${locale}/${post.slug}`)
}
