import { HTML_LANG, type Locale } from './config'

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

  return d.toLocaleDateString(HTML_LANG[locale], options)
}

/**
 * 언어 이름 가져오기
 */
export function getLanguageName(locale: Locale): string {
  return locale === 'ko' ? '한국어' : 'English'
}
