'use client'

import type React from 'react'
import { createContext, useContext, useEffect, useState } from 'react'
import enTranslations from './locales/en.json'
import koTranslations from './locales/ko.json'

export type Locale = 'en' | 'ko'

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

const translations = {
  en: enTranslations,
  ko: koTranslations,
}

// 브라우저 언어 감지 함수
function detectBrowserLanguage(): Locale {
  if (typeof window === 'undefined') return 'en'

  const browserLang = navigator.language.toLowerCase()

  // 한국어 감지
  if (browserLang.startsWith('ko')) {
    return 'ko'
  }

  // 기본값은 영어
  return 'en'
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')

  // 초기 언어 설정
  useEffect(() => {
    const savedLocale = localStorage.getItem('locale') as Locale | null
    const initialLocale = savedLocale || detectBrowserLanguage()
    setLocaleState(initialLocale)
  }, [])

  // locale 변경 시 저장
  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem('locale', newLocale)
    // HTML lang 속성 업데이트
    if (typeof document !== 'undefined') {
      document.documentElement.lang = newLocale === 'ko' ? 'ko-KR' : 'en-US'
    }
  }

  // 번역 함수
  const t = (key: string): string => {
    const keys = key.split('.')
    // biome-ignore lint/suspicious/noExplicitAny: Dynamic translation key access requires any type
    let value: any = translations[locale]

    for (const k of keys) {
      value = value?.[k]
      if (value === undefined) break
    }

    return value || key
  }

  return <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}
