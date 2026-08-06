'use client'

// 태그 표시 라벨 공급 — 서버 layout이 URL의 locale로 확정한 라벨맵을 주입한다.
import { slug as slugify } from 'github-slugger'
import { createContext, useCallback, useContext } from 'react'

const TagLabelsContext = createContext<Record<string, string>>({})

export function TagLabelsProvider({
  labels,
  children,
}: {
  labels: Record<string, string>
  children: React.ReactNode
}) {
  return <TagLabelsContext.Provider value={labels}>{children}</TagLabelsContext.Provider>
}

/**
 * 태그 → 표시 라벨.
 * 항상 slugify해서 조회하므로 원본 문자열("Next.js")과 slug("nextjs") 어느 쪽을 넘겨도 동작하고,
 * 마스터에 없는 태그는 원본을 그대로 반환한다.
 */
export function useTagLabel(): (tag: string) => string {
  const labels = useContext(TagLabelsContext)
  return useCallback((tag: string) => labels[slugify(tag)] ?? tag, [labels])
}
