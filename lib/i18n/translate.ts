import type { Locale } from './config'
import enTranslations from './locales/en.json'
import koTranslations from './locales/ko.json'

const translations = {
  en: enTranslations,
  ko: koTranslations,
}

/**
 * 점 경로로 번역 문자열 조회. 미스 시 key를 그대로 반환한다.
 * vars가 있으면 `{name}` 플레이스홀더를 치환한다.
 *
 * 서버 컴포넌트(generateMetadata 등)와 클라이언트 Context가 같은 구현을 공유한다.
 */
export function translate(
  locale: Locale,
  key: string,
  vars?: Record<string, string | number>
): string {
  const keys = key.split('.')
  // biome-ignore lint/suspicious/noExplicitAny: Dynamic translation key access requires any type
  let value: any = translations[locale]

  for (const k of keys) {
    value = value?.[k]
    if (value === undefined) break
  }

  const resolved = typeof value === 'string' ? value : key
  if (!vars) return resolved

  return resolved.replace(/\{(\w+)\}/g, (match, name) =>
    name in vars ? String(vars[name]) : match
  )
}

/** 서버 컴포넌트용 — locale에 고정된 t() 함수를 만든다 */
export function getTranslations(locale: Locale) {
  return (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars)
}
