'use client'

import type React from 'react'
import { createContext, useCallback, useContext, useMemo } from 'react'
import type { Locale } from './config'
import { translate } from './translate'

// 단일 소스는 './config' — 서버 코드가 'use client' 모듈을 import하지 않도록 여기서 재수출만 한다
export type { Locale }

interface I18nContextType {
  locale: Locale
  t: (key: string, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

/**
 * locale은 URL(`/ko`, `/en`)에서 서버가 확정해 주입한다.
 * localStorage·navigator 감지를 하지 않으므로 SSR HTML의 언어가 URL과 항상 일치하고,
 * "ko로 그렸다가 en으로 교체되는" 초기 깜빡임이 없다.
 */
export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale]
  )
  const value = useMemo(() => ({ locale, t }), [locale, t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}
