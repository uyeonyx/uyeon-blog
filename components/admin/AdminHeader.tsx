'use client'

import { Icon } from '@iconify/react'
import { motion } from 'framer-motion'
import ThemeSwitch from '@/components/ThemeSwitch'
import { useDirtyGuard } from './DirtyGuard'

export default function AdminHeader({ login }: { login: string }) {
  const { guardedNavigate } = useDirtyGuard()

  return (
    <header className="relative z-50 flex justify-center pt-8 pb-4">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative mx-4 w-full max-w-3xl overflow-visible rounded-full border border-white/60 bg-white/70 px-4 py-3 shadow-2xl shadow-gray-900/20 backdrop-blur-3xl before:absolute before:inset-0 before:rounded-full before:bg-linear-to-b before:from-white/40 before:to-transparent before:pointer-events-none sm:mx-6 sm:px-6 dark:border-gray-600/80 dark:bg-gray-800/70 dark:shadow-primary-500/20 dark:before:from-white/10"
      >
        <div className="absolute inset-0 rounded-full bg-linear-to-r from-primary-500/10 via-primary-400/5 to-primary-600/10" />
        <div className="relative flex items-center gap-3 sm:gap-5">
          <button
            type="button"
            onClick={() => guardedNavigate('/admin')}
            className="flex shrink-0 items-center gap-2 text-lg font-bold tracking-tight text-gray-900 dark:text-white"
          >
            <Icon icon="solar:pen-new-square-bold" className="size-5 text-primary-500" />
            작성자 모드
          </button>
          <div className="h-6 w-px bg-gray-300 dark:bg-gray-700" />
          <nav className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => guardedNavigate('/admin')}
              className="rounded-full px-3 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-900/5 hover:text-gray-900 dark:text-gray-200 dark:hover:bg-white/10 dark:hover:text-white"
            >
              글
            </button>
            <button
              type="button"
              onClick={() => guardedNavigate('/admin/projects')}
              className="rounded-full px-3 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-900/5 hover:text-gray-900 dark:text-gray-200 dark:hover:bg-white/10 dark:hover:text-white"
            >
              프로젝트
            </button>
            <button
              type="button"
              onClick={() => guardedNavigate('/admin/tags')}
              className="rounded-full px-3 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-900/5 hover:text-gray-900 dark:text-gray-200 dark:hover:bg-white/10 dark:hover:text-white"
            >
              태그
            </button>
            <button
              type="button"
              onClick={() => guardedNavigate('/admin/about')}
              className="rounded-full px-3 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-900/5 hover:text-gray-900 dark:text-gray-200 dark:hover:bg-white/10 dark:hover:text-white"
            >
              소개
            </button>
            <button
              type="button"
              onClick={() => guardedNavigate('/')}
              className="hidden rounded-full px-3 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-900/5 hover:text-gray-900 sm:block dark:text-gray-200 dark:hover:bg-white/10 dark:hover:text-white"
            >
              블로그 보기
            </button>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-sm text-gray-500 sm:inline dark:text-gray-400">
              @{login}
            </span>
            <div className="[&>button]:rounded-full [&>button]:border [&>button]:border-gray-300/50 [&>button]:p-2 [&>button]:text-gray-700 [&>button]:transition-colors [&>button]:hover:bg-gray-900/5 [&>button]:hover:text-gray-900 [&>button]:dark:border-gray-500/50 [&>button]:dark:text-gray-200 [&>button]:dark:hover:bg-white/10 [&>button]:dark:hover:text-white">
              <ThemeSwitch />
            </div>
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                aria-label="로그아웃"
                className="flex items-center gap-1.5 rounded-full border border-gray-300/50 p-2 text-gray-700 transition-colors hover:bg-gray-900/5 hover:text-gray-900 sm:px-3 dark:border-gray-500/50 dark:text-gray-200 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <Icon icon="solar:logout-2-bold" className="size-4" />
                <span className="hidden text-sm font-medium sm:inline">로그아웃</span>
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    </header>
  )
}
