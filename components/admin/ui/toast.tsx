'use client'

import { Icon } from '@iconify/react'
import { AnimatePresence, motion } from 'framer-motion'
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

type ToastKind = 'success' | 'error' | 'info' | 'loading'

interface ToastItem {
  id: number
  kind: ToastKind
  text: string
}

interface ToastApi {
  toast: (kind: Exclude<ToastKind, 'loading'>, text: string) => void
  loading: (text: string) => number
  update: (id: number, kind: Exclude<ToastKind, 'loading'>, text: string) => void
  dismiss: (id: number) => void
}

const ToastContext = createContext<ToastApi | null>(null)

export function useAdminToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useAdminToast must be used within AdminToastProvider')
  return ctx
}

const KIND_ICON: Record<ToastKind, { icon: string; className: string }> = {
  success: { icon: 'solar:check-circle-bold', className: 'text-green-500' },
  error: { icon: 'solar:danger-circle-bold', className: 'text-red-500' },
  info: { icon: 'solar:info-circle-bold', className: 'text-primary-500' },
  loading: { icon: 'solar:refresh-bold', className: 'animate-spin text-primary-500' },
}

const AUTO_DISMISS_MS: Partial<Record<ToastKind, number>> = {
  success: 4000,
  info: 4000,
  error: 6000,
}

export function AdminToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const idRef = useRef(0)
  const timersRef = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: number) => {
    const timer = timersRef.current.get(id)
    if (timer) clearTimeout(timer)
    timersRef.current.delete(id)
    setItems((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (kind: ToastKind, text: string) => {
      const id = ++idRef.current
      setItems((prev) => [...prev, { id, kind, text }])
      const ttl = AUTO_DISMISS_MS[kind]
      if (ttl)
        timersRef.current.set(
          id,
          setTimeout(() => dismiss(id), ttl)
        )
      return id
    },
    [dismiss]
  )

  const api = useMemo<ToastApi>(
    () => ({
      toast: (kind, text) => {
        push(kind, text)
      },
      loading: (text) => push('loading', text),
      update: (id, kind, text) => {
        setItems((prev) => prev.map((t) => (t.id === id ? { ...t, kind, text } : t)))
        const timer = timersRef.current.get(id)
        if (timer) clearTimeout(timer)
        const ttl = AUTO_DISMISS_MS[kind]
        if (ttl)
          timersRef.current.set(
            id,
            setTimeout(() => dismiss(id), ttl)
          )
      },
      dismiss,
    }),
    [push, dismiss]
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-6 z-60 flex w-full max-w-sm flex-col items-end gap-2 sm:right-6">
        <AnimatePresence>
          {items.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              role={item.kind === 'error' ? 'alert' : 'status'}
              aria-live={item.kind === 'error' ? 'assertive' : 'polite'}
              className="pointer-events-auto flex max-w-full items-start gap-2.5 rounded-2xl border border-white/60 bg-white/70 px-4 py-2.5 shadow-2xl shadow-gray-900/20 backdrop-blur-3xl dark:border-gray-600/80 dark:bg-gray-800/70 dark:shadow-primary-500/20"
            >
              <Icon
                icon={KIND_ICON[item.kind].icon}
                className={cn('mt-0.5 size-4 shrink-0', KIND_ICON[item.kind].className)}
              />
              <p className="min-w-0 text-sm font-medium break-words text-gray-800 dark:text-gray-100">
                {item.text}
              </p>
              <button
                type="button"
                aria-label="알림 닫기"
                onClick={() => dismiss(item.id)}
                className="mt-0.5 shrink-0 rounded-full text-gray-400 transition-colors hover:text-gray-700 dark:hover:text-gray-200"
              >
                <Icon icon="solar:close-circle-bold" className="size-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
