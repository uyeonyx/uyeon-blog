'use client'

import { Icon } from '@iconify/react'
import { motion } from 'framer-motion'
import Link from '@/components/Link'
import { useI18n } from '@/lib/i18n/i18n-context'

const COPY = {
  ko: {
    title: '비공개된 글입니다',
    description: '이 글은 작성자가 비공개로 전환했습니다. 나중에 다시 공개될 수 있어요.',
    backToBlog: '블로그 목록으로',
    backToHome: '홈으로',
  },
  en: {
    title: 'This post is private',
    description: 'The author has made this post private. It may become available again later.',
    backToBlog: 'Back to blog',
    backToHome: 'Home',
  },
} as const

export default function PrivatePostNotice() {
  const { locale } = useI18n()
  const copy = COPY[locale === 'ko' ? 'ko' : 'en']

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex justify-center pt-24 pb-32"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-white/60 bg-white/70 shadow-xl shadow-gray-900/10 backdrop-blur-3xl before:absolute before:inset-0 before:rounded-2xl before:bg-linear-to-b before:from-white/40 before:to-transparent before:pointer-events-none dark:border-gray-700/80 dark:bg-gray-900/70 dark:shadow-primary-500/10 dark:before:from-white/5">
        <div className="relative flex flex-col items-center gap-4 p-10 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-primary-500/10">
            <Icon icon="solar:lock-keyhole-minimalistic-bold" className="size-7 text-primary-500" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="block bg-linear-to-r from-gray-900 via-gray-700 to-gray-900 bg-clip-text text-transparent dark:from-gray-50 dark:via-gray-300 dark:to-gray-50">
              {copy.title}
            </span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400">{copy.description}</p>
          <div className="mt-2 flex gap-3">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-5 py-2.5 text-sm font-semibold text-gray-900 shadow-lg backdrop-blur-3xl transition-all hover:scale-105 hover:border-primary-500/50 dark:border-gray-600/80 dark:bg-gray-800/70 dark:text-gray-100"
            >
              {copy.backToBlog}
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full bg-primary-500/90 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-500/30 transition-all hover:scale-105 hover:bg-primary-500 active:scale-95"
            >
              {copy.backToHome}
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
