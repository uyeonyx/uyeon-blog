'use client'

import { SEARCH_OPEN_EVENT } from '@/components/search/search-events'
import { useI18n } from '@/lib/i18n/i18n-context'

/**
 * kbar를 직접 참조하지 않는 순수 버튼 — 이벤트만 쏜다.
 * SearchIsland가 미마운트면 마운트+열기, 마운트됐으면 OpenBridge가 토글한다.
 */
const SearchButton = () => {
  const { t } = useI18n()

  return (
    <button
      type="button"
      aria-label={t('common.search')}
      onClick={() => window.dispatchEvent(new CustomEvent(SEARCH_OPEN_EVENT))}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-5 w-5"
        role="img"
      >
        <title>{t('common.search')}</title>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
        />
      </svg>
    </button>
  )
}

export default SearchButton
