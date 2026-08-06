import { notFound } from 'next/navigation'
import { isLocale, type Locale } from './config'

/**
 * 라우트 파라미터의 locale 검증. `/foobar` 처럼 `[locale]`에 매칭되기만 한 경로를
 * 200으로 렌더하지 않고 404로 떨어뜨린다.
 *
 * 레이아웃이 아니라 각 page에서 호출한다 — 루트 레이아웃에서 notFound()를 던지면
 * 위쪽에 받아줄 경계가 없다.
 */
export function assertLocale(value: string): Locale {
  if (!isLocale(value)) notFound()
  return value
}
