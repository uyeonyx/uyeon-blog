'use client'

import { useRouter } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import ConfirmDialog from './ui/ConfirmDialog'

interface DirtyGuardApi {
  setDirty: (dirty: boolean) => void
  /** dirty면 확인 다이얼로그를 거쳐 이동, 아니면 즉시 이동 */
  guardedNavigate: (href: string) => void
}

const DirtyGuardContext = createContext<DirtyGuardApi | null>(null)

export function useDirtyGuard(): DirtyGuardApi {
  const ctx = useContext(DirtyGuardContext)
  if (!ctx) throw new Error('useDirtyGuard must be used within DirtyGuardProvider')
  return ctx
}

export function DirtyGuardProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const dirtyRef = useRef(false)
  const [pendingHref, setPendingHref] = useState<string | null>(null)

  const setDirty = useCallback((dirty: boolean) => {
    dirtyRef.current = dirty
  }, [])

  const guardedNavigate = useCallback(
    (href: string) => {
      if (dirtyRef.current) {
        setPendingHref(href)
      } else {
        router.push(href)
      }
    },
    [router]
  )

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  return (
    <DirtyGuardContext.Provider value={{ setDirty, guardedNavigate }}>
      {children}
      <ConfirmDialog
        open={pendingHref !== null}
        onOpenChange={(open) => !open && setPendingHref(null)}
        title="저장하지 않은 변경이 있습니다"
        description="이 페이지를 벗어나면 저장하지 않은 변경 내용이 사라집니다. 계속할까요?"
        confirmLabel="나가기"
        danger
        onConfirm={() => {
          const href = pendingHref
          setPendingHref(null)
          dirtyRef.current = false
          if (href) router.push(href)
        }}
      />
    </DirtyGuardContext.Provider>
  )
}
