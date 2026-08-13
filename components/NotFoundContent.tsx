'use client'

import { Icon } from '@iconify/react'
import { motion } from 'framer-motion'
import Link from '@/components/Link'
import { useI18n } from '@/lib/i18n/i18n-context'

// 라우트 단위 not-found와 global-not-found가 공유하는 404 본문.
// 사이트 디자인 언어(글래스 카드 + 그라디언트 타이포 + 홈 히어로의 `〉 _` 프롬프트 모티프)를 따른다
// — PostNotice와 같은 계열.
export default function NotFoundContent() {
  const { t } = useI18n()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex justify-center pt-24 pb-32"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-white/60 bg-white/70 shadow-xl shadow-gray-900/10 backdrop-blur-3xl before:pointer-events-none before:absolute before:inset-0 before:rounded-2xl before:bg-linear-to-b before:from-white/40 before:to-transparent dark:border-gray-700/80 dark:bg-gray-900/70 dark:shadow-primary-500/10 dark:before:from-white/5">
        <div className="relative flex flex-col items-center gap-4 p-10 text-center">
          <span className="bg-primary-500/10 flex size-14 items-center justify-center rounded-full">
            <Icon icon="solar:link-broken-bold" className="text-primary-500 size-7" />
          </span>

          {/* 홈 히어로의 타이핑 프롬프트 모티프 — 〉 404_ */}
          <p className="text-5xl font-extrabold tracking-tight">
            <span className="inline-flex items-center gap-2">
              <span className="text-primary-500 dark:text-primary-400 shrink-0">〉</span>
              <span className="bg-linear-to-r from-gray-900 via-gray-700 to-gray-900 bg-clip-text text-transparent dark:from-gray-50 dark:via-gray-300 dark:to-gray-50">
                {t('notFound.title')}
                <span className="animate-blink ml-0.5 inline-block text-gray-900 motion-reduce:animate-none dark:text-gray-50">
                  _
                </span>
              </span>
            </span>
          </p>

          <h1 className="text-2xl font-bold tracking-tight">
            <span className="block bg-linear-to-r from-gray-900 via-gray-700 to-gray-900 bg-clip-text text-transparent dark:from-gray-50 dark:via-gray-300 dark:to-gray-50">
              {t('notFound.message')}
            </span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400">{t('notFound.description')}</p>

          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <Link
              href="/"
              className="bg-primary-500/90 shadow-primary-500/30 hover:bg-primary-500 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 active:scale-95"
            >
              {t('notFound.backToHome')}
            </Link>
            <Link
              href="/blog"
              className="hover:border-primary-500/50 inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-5 py-2.5 text-sm font-semibold text-gray-900 shadow-lg backdrop-blur-3xl transition-all hover:scale-105 dark:border-gray-600/80 dark:bg-gray-800/70 dark:text-gray-100"
            >
              {t('postNotice.backToBlog')}
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
