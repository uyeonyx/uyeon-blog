'use client'

// kbar를 초기 청크에서 밀어낸다: 유휴 시점(requestIdleCallback) 또는 첫 검색 의도(⌘K,
// 검색 버튼)에 SearchModal을 동적 마운트한다. 마운트 후의 단축키·이벤트는 kbar 자신과
// OpenBridge가 처리하므로 여기 리스너는 마운트 시점에 해제된다.
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { SEARCH_OPEN_EVENT } from './search-events'

const SearchModal = dynamic(() => import('./SearchModal'), { ssr: false })

type Mode = null | 'idle' | 'open' // null = 미마운트

export default function SearchIsland() {
  const [mode, setMode] = useState<Mode>(null)

  useEffect(() => {
    if (mode !== null) return

    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setMode('open')
      }
    }
    const onOpen = () => setMode('open')
    const mountIdle = () => setMode((m) => m ?? 'idle')

    window.addEventListener('keydown', onKey)
    window.addEventListener(SEARCH_OPEN_EVENT, onOpen)
    // 유휴 시점 마운트 — h/b/t/p/a 내비 단축키가 검색 의도 없이도 동작하게
    const useIdle = typeof window.requestIdleCallback === 'function'
    const idleId = useIdle
      ? window.requestIdleCallback(mountIdle, { timeout: 2000 })
      : window.setTimeout(mountIdle, 2000)

    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener(SEARCH_OPEN_EVENT, onOpen)
      if (useIdle) window.cancelIdleCallback(idleId as number)
      else window.clearTimeout(idleId)
    }
  }, [mode])

  if (mode === null) return null
  return <SearchModal openOnMount={mode === 'open'} />
}
