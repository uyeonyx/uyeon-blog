'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { type Locale, useI18n } from '@/lib/i18n/i18n-context'
import { getLanguageName } from '@/lib/i18n/utils'

const LanguageSwitch = () => {
  const { locale, setLocale, t } = useI18n()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleLanguage = () => {
    const newLocale: Locale = locale === 'en' ? 'ko' : 'en'
    setLocale(newLocale)
  }

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label={t('common.toggleLanguage')}
        className="rounded-full p-2 transition-colors"
      >
        <span className="text-sm font-medium">EN</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      aria-label={`${t('common.switchTo')} ${getLanguageName(locale === 'en' ? 'ko' : 'en')}`}
      onClick={toggleLanguage}
      className="group relative flex items-center gap-2 rounded-full p-2 transition-colors"
      title={`${t('common.current')}: ${getLanguageName(locale)}`}
    >
      <motion.div
        className="flex items-center gap-1.5"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* 지구본 아이콘 */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z"
            clipRule="evenodd"
          />
        </svg>

        {/* 언어 코드 */}
        <span className="text-sm font-medium uppercase tracking-wide">{locale}</span>
      </motion.div>

      {/* 호버 시 툴팁 */}
      <div className="pointer-events-none absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-gray-100 dark:text-gray-900">
        {getLanguageName(locale === 'en' ? 'ko' : 'en')}
      </div>
    </button>
  )
}

export default LanguageSwitch
