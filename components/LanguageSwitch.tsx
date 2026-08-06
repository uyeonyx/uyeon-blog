'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import type { Locale } from '@/lib/i18n/config'
import { useI18n } from '@/lib/i18n/i18n-context'
import { swapLocale } from '@/lib/i18n/paths'
import { getLanguageName } from '@/lib/i18n/utils'

interface SwitchLinkProps {
  href: string
  locale: Locale
  other: Locale
  switchLabel: string
  currentLabel: string
}

/**
 * 언어 전환은 상태 토글이 아니라 링크다 — 크롤러가 따라갈 수 있고, 새 탭·가운데 클릭도 동작한다.
 * 쿠키는 루트(`/`) 진입 시 어느 언어로 보낼지에만 쓰이고 콘텐츠 결정에는 관여하지 않는다.
 */
function SwitchLink({ href, locale, other, switchLabel, currentLabel }: SwitchLinkProps) {
  const rememberChoice = () => {
    // biome-ignore lint/suspicious/noDocumentCookie: CookieStore는 Safari 미지원이고 이 한 줄에 폴백을 두는 편이 과하다
    document.cookie = `NEXT_LOCALE=${other};path=/;max-age=31536000;samesite=lax`
  }

  return (
    // next/link를 직접 쓴다 — 이미 로케일이 확정된 절대경로라 components/Link의 접두사 로직이 필요 없다
    <Link
      href={href}
      hrefLang={other}
      prefetch={false}
      onClick={rememberChoice}
      aria-label={`${switchLabel} ${getLanguageName(other)}`}
      className="group relative flex items-center gap-2 rounded-full p-2 transition-colors"
      title={`${currentLabel}: ${getLanguageName(locale)}`}
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
        {getLanguageName(other)}
      </div>
    </Link>
  )
}

/** 쿼리스트링(`/projects?project=slug`)까지 보존하는 변형 */
function SwitchLinkWithQuery({ base, ...rest }: Omit<SwitchLinkProps, 'href'> & { base: string }) {
  const query = useSearchParams().toString()
  return <SwitchLink href={`${base}${query ? `?${query}` : ''}`} {...rest} />
}

const LanguageSwitch = () => {
  const { locale, t } = useI18n()
  const pathname = usePathname()

  const other: Locale = locale === 'en' ? 'ko' : 'en'
  const base = swapLocale(pathname, other)
  const props = {
    locale,
    other,
    switchLabel: t('common.switchTo'),
    currentLabel: t('common.current'),
  }

  // useSearchParams는 정적 프리렌더를 CSR로 떨어뜨린다(global-not-found 등).
  // 폴백도 동작하는 링크라 쿼리 보존만 하이드레이션 이후로 미뤄진다.
  return (
    <Suspense fallback={<SwitchLink href={base} {...props} />}>
      <SwitchLinkWithQuery base={base} {...props} />
    </Suspense>
  )
}

export default LanguageSwitch
