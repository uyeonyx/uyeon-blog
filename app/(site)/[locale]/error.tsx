'use client'

// (site) 세그먼트 에러 경계 — DB 장애 등에서 스타일 없는 Next 기본 페이지 대신
// 로케일 인지 UI + 재시도 버튼을 보여준다. 경계는 [locale]/layout.tsx 안에서 렌더되므로
// I18nProvider 컨텍스트(useI18n)를 그대로 쓸 수 있다.
import { useEffect } from 'react'
import Link from '@/components/Link'
import { useI18n } from '@/lib/i18n/i18n-context'

export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { t } = useI18n()

  useEffect(() => {
    console.error('[site] error boundary:', error)
  }, [error])

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 py-24 text-center">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
        {t('errors.title')}
      </h1>
      <p className="max-w-md text-gray-600 dark:text-gray-400">{t('errors.description')}</p>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={reset}
          className="bg-primary-500 hover:bg-primary-600 rounded-lg px-5 py-2.5 font-semibold text-white transition-colors"
        >
          {t('errors.retry')}
        </button>
        <Link
          href="/"
          className="text-primary-500 hover:text-primary-600 dark:hover:text-primary-400 font-medium"
        >
          {t('errors.backToHome')}
        </Link>
      </div>
    </div>
  )
}
