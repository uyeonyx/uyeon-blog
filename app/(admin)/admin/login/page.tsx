import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/admin/session'

export const metadata: Metadata = {
  title: 'Admin Login',
  robots: { index: false, follow: false },
}

export default async function AdminLoginPage() {
  const session = await getAdminSession()
  if (session) {
    redirect('/admin')
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="relative w-full max-w-sm animate-fadeIn rounded-2xl border border-white/60 bg-white/70 shadow-xl shadow-gray-900/10 backdrop-blur-3xl before:absolute before:inset-0 before:rounded-2xl before:bg-linear-to-b before:from-white/40 before:to-transparent before:pointer-events-none dark:border-gray-700/80 dark:bg-gray-900/70 dark:shadow-primary-500/10 dark:before:from-white/5">
        <div className="relative p-8 text-center">
          <h1 className="mb-2 text-2xl font-bold tracking-tight">
            <span className="block bg-linear-to-r from-gray-900 via-gray-700 to-gray-900 bg-clip-text text-transparent dark:from-gray-50 dark:via-gray-300 dark:to-gray-50">
              작성자 모드
            </span>
          </h1>
          <p className="mb-8 text-sm text-gray-500 dark:text-gray-400">
            블로그 주인만 로그인할 수 있습니다.
          </p>
          <a
            href="/api/auth/github/login"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-gray-900/30 transition-all hover:scale-105 hover:bg-gray-700 active:scale-95 dark:bg-gray-100 dark:text-gray-900 dark:shadow-gray-100/10 dark:hover:bg-gray-300"
          >
            <svg viewBox="0 0 16 16" className="h-5 w-5" fill="currentColor" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
            </svg>
            GitHub으로 로그인
          </a>
        </div>
      </div>
    </div>
  )
}
