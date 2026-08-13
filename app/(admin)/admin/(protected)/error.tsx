'use client'

import Link from 'next/link'
// admin 에러 경계 — 저장 중 DB 오류 등에서 복구 동선을 제공한다
import { useEffect } from 'react'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[admin] error boundary:', error)
  }, [error])

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 py-24 text-center">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">문제가 발생했습니다</h1>
      <p className="max-w-md text-gray-600 dark:text-gray-400">
        일시적인 오류일 수 있습니다. 다시 시도해 주세요.
      </p>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={reset}
          className="bg-primary-500 hover:bg-primary-600 rounded-lg px-5 py-2.5 font-semibold text-white transition-colors"
        >
          다시 시도
        </button>
        <Link
          href="/admin"
          className="text-primary-500 hover:text-primary-600 dark:hover:text-primary-400 font-medium"
        >
          목록으로
        </Link>
      </div>
    </div>
  )
}
