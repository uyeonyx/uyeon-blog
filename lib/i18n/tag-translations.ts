import type { Locale } from './i18n-context'
import tagTranslationsData from './locales/tag-translations.json'

/**
 * 태그 번역 매핑
 * 키는 영어 slug, 값은 언어별 표시 이름
 */
export const tagTranslations = tagTranslationsData as Record<string, Record<Locale, string>>

/**
 * 태그를 현재 언어로 번역
 * 번역이 없으면 원본 태그 반환
 */
export function translateTag(tag: string, locale: Locale): string {
  return tagTranslations[tag]?.[locale] || tag
}

/**
 * 모든 태그를 현재 언어로 번역
 */
export function translateTags(tags: string[], locale: Locale): string[] {
  return tags.map((tag) => translateTag(tag, locale))
}
