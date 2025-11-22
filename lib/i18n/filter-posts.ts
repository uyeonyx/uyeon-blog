import type { Locale } from './i18n-context'

// Blog 타입에 language 속성을 포함하는 제네릭 타입
type PostWithLanguage = {
  language?: string
  slug?: string
  // biome-ignore lint/suspicious/noExplicitAny: Allow any additional properties
  [key: string]: any
}

/**
 * 언어별로 포스트 필터링
 * 언어가 없는 포스트(기존 포스트)는 모든 언어에서 표시됨
 */
export function filterPostsByLanguage<T extends { language?: string }>(
  posts: T[],
  locale: Locale
): T[] {
  return posts.filter((post) => {
    // 언어가 지정되지 않은 포스트는 모든 언어에서 표시
    if (!post.language) return true
    // 언어가 지정된 포스트는 해당 언어에서만 표시
    return post.language === locale
  })
}

/**
 * 현재 언어로 번역된 포스트 찾기
 */
export function findLocalizedPost<T extends PostWithLanguage>(
  posts: T[],
  slug: string,
  locale: Locale
): T | undefined {
  return posts.find((post) => post.slug === slug && post.language === locale)
}

/**
 * 언어별로 사용 가능한 포스트가 있는지 확인
 */
export function hasPostInLanguage<T extends PostWithLanguage>(
  posts: T[],
  slug: string,
  locale: Locale
): boolean {
  return posts.some((post) => post.slug === slug && post.language === locale)
}
