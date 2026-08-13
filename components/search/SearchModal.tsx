'use client'

// kbar 검색 팔레트 — SearchIsland가 지연 마운트한다. 이 파일이 kbar(~135KB)를 끌고 오는
// 유일한 경계이므로 초기 청크에 실리지 않는다 (next/dynamic으로만 import될 것).
import { useKBar } from 'kbar'
import { useEffect } from 'react'
import { CustomSearchProvider } from '@/components/SearchProvider'
import { SEARCH_OPEN_EVENT } from './search-events'

/** 마운트 계기가 "열기"였다면 즉시 열고, 이후의 열기 이벤트도 여기서 받는다 */
function OpenBridge({ openOnMount }: { openOnMount: boolean }) {
  const { query } = useKBar()

  useEffect(() => {
    if (openOnMount) query.toggle()
    // 최초 마운트 시 1회만 — openOnMount는 이후 변하지 않는다
    // biome-ignore lint/correctness/useExhaustiveDependencies: 마운트 시 1회
  }, [])

  useEffect(() => {
    const onOpen = () => query.toggle()
    window.addEventListener(SEARCH_OPEN_EVENT, onOpen)
    return () => window.removeEventListener(SEARCH_OPEN_EVENT, onOpen)
  }, [query])

  return null
}

export default function SearchModal({ openOnMount }: { openOnMount: boolean }) {
  return (
    <CustomSearchProvider>
      <OpenBridge openOnMount={openOnMount} />
    </CustomSearchProvider>
  )
}
