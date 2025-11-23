import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 문자열의 일반 따옴표를 올바른 타이포그래피 따옴표로 변환
 * Converts straight quotes to typographically correct curly quotes
 */
export function smartQuotes(text: string | undefined): string {
  if (!text) return ''

  let result = text

  // 대시 변환 먼저 (Dashes - 먼저 처리해야 따옴표 변환과 충돌 없음)
  result = result.replace(/---/g, '\u2014') // em dash
  result = result.replace(/--/g, '\u2013') // en dash

  // 말줄임표 (Ellipsis)
  result = result.replace(/\.\.\./g, '\u2026')

  // 큰따옴표 변환 (Double quotes)
  // 여는 큰따옴표: 공백, 시작, 또는 특수문자 다음에 오는 "
  result = result.replace(/(^|[-–—\s([{*_])"/g, '$1\u201C')
  // 닫는 큰따옴표: 나머지 모든 "
  result = result.replace(/"/g, '\u201D')

  // 작은따옴표 변환 (Single quotes)
  // 소유격과 축약형 먼저 처리 (don't, it's, '90s 등)
  result = result.replace(/(\w)'(\w)/g, '$1\u2019$2')
  result = result.replace(/'(\d\d)/g, '\u2019$1')
  
  // 여는 작은따옴표: 공백, 시작, 또는 특수문자 다음에 오는 '
  result = result.replace(/(^|[-–—\s([{*_])'/g, '$1\u2018')
  // 닫는 작은따옴표: 나머지 모든 '
  result = result.replace(/'/g, '\u2019')

  return result
}
