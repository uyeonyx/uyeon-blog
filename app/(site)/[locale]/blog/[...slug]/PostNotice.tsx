'use client'

import { Icon } from '@iconify/react'
import { motion } from 'framer-motion'
import Link from '@/components/Link'
import type { Locale } from '@/lib/i18n/config'
import { useI18n } from '@/lib/i18n/i18n-context'
import { getLanguageName } from '@/lib/i18n/utils'

const COPY = {
  ko: {
    private: {
      title: '비공개된 글입니다',
      description: '이 글은 작성자가 비공개로 전환했습니다. 나중에 다시 공개될 수 있어요.',
    },
    untranslated: {
      title: '이 언어로는 아직 제공되지 않는 글입니다',
      description: '이 글은 아직 번역되지 않았습니다. 아래 언어로는 읽을 수 있어요.',
    },
    backToBlog: '블로그 목록으로',
    backToHome: '홈으로',
  },
  en: {
    private: {
      title: 'This post is private',
      description: 'The author has made this post private. It may become available again later.',
    },
    untranslated: {
      title: 'Not available in this language yet',
      description: "This post hasn't been translated yet. You can read it in the language below.",
    },
    backToBlog: 'Back to blog',
    backToHome: 'Home',
  },
} as const

interface PostNoticeProps {
  variant: 'private' | 'untranslated'
  /** variant='untranslated'일 때 — 이 글이 실제로 존재하는 언어 */
  otherLocale?: Locale
  slug?: string
}

export default function PostNotice({ variant, otherLocale, slug }: PostNoticeProps) {
  const { locale } = useI18n()
  const copy = COPY[locale]
  const { title, description } = copy[variant]

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
            <Icon
              icon={
                variant === 'private'
                  ? 'solar:lock-keyhole-minimalistic-bold'
                  : 'solar:translation-bold'
              }
              className="size-7 text-primary-500"
            />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="block bg-linear-to-r from-gray-900 via-gray-700 to-gray-900 bg-clip-text text-transparent dark:from-gray-50 dark:via-gray-300 dark:to-gray-50">
              {title}
            </span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400">{description}</p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            {otherLocale && slug && (
              <Link
                href={`/${otherLocale}/blog/${slug}`}
                hrefLang={otherLocale}
                className="inline-flex items-center gap-2 rounded-full bg-primary-500/90 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary-500/30 transition-all hover:scale-105 hover:bg-primary-500 active:scale-95"
              >
                {getLanguageName(otherLocale)}
              </Link>
            )}
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-5 py-2.5 text-sm font-semibold text-gray-900 shadow-lg backdrop-blur-3xl transition-all hover:scale-105 hover:border-primary-500/50 dark:border-gray-600/80 dark:bg-gray-800/70 dark:text-gray-100"
            >
              {copy.backToBlog}
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-5 py-2.5 text-sm font-semibold text-gray-900 shadow-lg backdrop-blur-3xl transition-all hover:scale-105 hover:border-primary-500/50 dark:border-gray-600/80 dark:bg-gray-800/70 dark:text-gray-100"
            >
              {copy.backToHome}
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
