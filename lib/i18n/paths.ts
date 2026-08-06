import { LOCALES, type Locale } from './config'

/** 로케일 접두사를 붙이면 안 되는 경로 — 라우트 그룹 밖의 프로토콜/관리자 엔드포인트 */
const EXEMPT =
  /^\/(admin|api|mcp|og|static|_next|\.well-known|llms\.txt|llms-full\.txt|robots\.txt|sitemap\.xml|favicon\.ico)(\/|$)/

const PREFIXED = new RegExp(`^/(${LOCALES.join('|')})(/|$)`)

/**
 * 내부 절대경로에 로케일 접두사를 붙인다. 멱등이므로 `/ko/ko/x`가 만들어지지 않는다.
 * 외부 URL·해시·mailto·면제 경로는 그대로 통과.
 */
export function withLocale(href: string, locale: Locale): string {
  if (!href.startsWith('/')) return href
  if (EXEMPT.test(href)) return href
  if (PREFIXED.test(href)) return href
  return href === '/' ? `/${locale}` : `/${locale}${href}`
}

/** '/ko/blog/foo' -> { locale: 'ko', rest: '/blog/foo' } */
export function stripLocale(pathname: string): { locale: Locale | null; rest: string } {
  const match = pathname.match(PREFIXED)
  if (!match) return { locale: null, rest: pathname }
  const rest = pathname.slice(match[1].length + 1)
  return { locale: match[1] as Locale, rest: rest === '' ? '/' : rest }
}

/** 현재 경로의 로케일만 갈아끼운다 (언어 전환 링크용) */
export function swapLocale(pathname: string, next: Locale): string {
  const { rest } = stripLocale(pathname)
  return withLocale(rest, next)
}

/**
 * 원시 세그먼트로 로케일 경로를 조립한다. 세그먼트마다 percent-encoding하므로
 * 한글 태그 slug가 sitemap `<loc>`에 그대로 들어가는 문제를 막는다.
 * (Next의 sitemap 직렬화기는 `<loc>`를 이스케이프하지 않는다)
 */
export function localePath(locale: Locale, seg = ''): string {
  const parts = seg.split('/').filter(Boolean).map(encodeURIComponent)
  return `/${[locale, ...parts].join('/')}`
}
