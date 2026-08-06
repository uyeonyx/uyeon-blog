/**
 * 로케일 단일 소스. 서버·클라이언트 양쪽에서 안전하게 import할 수 있도록
 * 'use client' 모듈(i18n-context.tsx)이 아니라 여기에 둔다.
 */

export const LOCALES = ['ko', 'en'] as const

export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'ko'

export function isLocale(value: string | undefined): value is Locale {
  return value === 'ko' || value === 'en'
}

/** <html lang> / Intl 포맷용 */
export const HTML_LANG: Record<Locale, string> = {
  ko: 'ko-KR',
  en: 'en-US',
}

/** og:locale (Facebook 규격) */
export const OG_LOCALE: Record<Locale, string> = {
  ko: 'ko_KR',
  en: 'en_US',
}

/**
 * hreflang / schema.org inLanguage용.
 * 지역이 아닌 언어 타게팅이므로 'en-US'가 아니라 'en' — 영국·호주 검색자에게도 매칭된다.
 */
export const BCP47: Record<Locale, string> = {
  ko: 'ko',
  en: 'en',
}
