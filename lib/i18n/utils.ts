import type { Locale } from './i18n-context'

/**
 * 파일명에서 언어 코드 추출
 * 예: "my-post.ko.mdx" -> "ko"
 * 예: "my-post.en.mdx" -> "en"
 * 예: "my-post.mdx" -> null
 */
export function extractLanguageFromFilename(filename: string): Locale | null {
  const match = filename.match(/\.(en|ko)\.mdx?$/)
  return match ? (match[1] as Locale) : null
}

/**
 * 파일 경로에서 언어 코드 제거
 * 예: "blog/my-post.ko" -> "blog/my-post"
 */
export function removeLanguageFromPath(path: string): string {
  return path.replace(/\.(en|ko)$/, '')
}

/**
 * 언어별 날짜 포맷
 */
export function formatDate(date: string, locale: Locale): string {
  const d = new Date(date)
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }

  return d.toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', options)
}

/**
 * 언어 이름 가져오기
 */
export function getLanguageName(locale: Locale): string {
  return locale === 'ko' ? '한국어' : 'English'
}
