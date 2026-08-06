import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/session'

export const metadata = {
  robots: { index: false, follow: false },
}

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin()

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <header className="mb-8 flex items-center justify-between border-b border-gray-200 pb-4 dark:border-gray-800">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-lg font-bold text-gray-900 dark:text-gray-100">
            작성자 모드
          </Link>
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            블로그 보기 →
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">@{session.login}</span>
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              로그아웃
            </button>
          </form>
        </div>
      </header>
      {children}
    </div>
  )
}
