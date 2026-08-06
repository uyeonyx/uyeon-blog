'use client'

// 태그 표시 라벨 공급 — 서버 layout이 DB 태그 마스터에서 라벨맵을 fetch해 주입한다.
// locale이 클라이언트 전용(localStorage)이므로 라벨 선택은 여기(클라이언트)에서 일어난다.
import { slug as slugify } from 'github-slugger'
import { createContext, useCallback, useContext } from 'react'
import type { TagLabelPair } from '@/lib/db/tags'
import { useI18n } from '@/lib/i18n/i18n-context'

const TagLabelsContext = createContext<Record<string, TagLabelPair>>({})

export function TagLabelsProvider({
  labels,
  children,
}: {
  labels: Record<string, TagLabelPair>
  children: React.ReactNode
}) {
  return <TagLabelsContext.Provider value={labels}>{children}</TagLabelsContext.Provider>
}

/**
 * 태그 → 현재 locale의 표시 라벨.
 * 항상 slugify해서 조회하므로 원본 문자열("Next.js")과 slug("nextjs") 어느 쪽을 넘겨도 동작하고,
 * 마스터에 없는 태그는 원본을 그대로 반환한다.
 */
export function useTagLabel(): (tag: string) => string {
  const labels = useContext(TagLabelsContext)
  const { locale } = useI18n()
  return useCallback((tag: string) => labels[slugify(tag)]?.[locale] ?? tag, [labels, locale])
}
