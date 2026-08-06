export const POSTS_PER_PAGE = 5

export function totalPagesOf(count: number): number {
  return Math.max(1, Math.ceil(count / POSTS_PER_PAGE))
}

/** 1-based 페이지 번호의 항목만 잘라낸다 */
export function pageSlice<T>(items: T[], page: number): T[] {
  return items.slice(POSTS_PER_PAGE * (page - 1), POSTS_PER_PAGE * page)
}
