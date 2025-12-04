'use client'

import { motion } from 'framer-motion'
import { formatDate } from 'pliny/utils/formatDate'
import { useEffect, useMemo, useState } from 'react'
import Link from '@/components/Link'
import Tag from '@/components/Tag'
import siteMetadata from '@/data/siteMetadata'
import { filterPostsByLanguage } from '@/lib/i18n/filter-posts'
import { useI18n } from '@/lib/i18n/i18n-context'

const MAX_DISPLAY = 5

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export default function Home({ posts }) {
  const { locale, t } = useI18n()
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0)
  const [displayedText, setDisplayedText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  // 언어별 문구들
  const phrasesKo = [
    '완성이 아닌 갱신',
    '해답이 아닌 질문',
    '깊은 생각, 빠른 실행',
    '무지에 대한 인식',
  ]

  const phrasesEn = [
    'Update, Not Completion',
    'Questions, Not Answers',
    'Deep thought, Fast execution',
    'Awareness of Unknowing',
  ]

  const phrases = locale === 'ko' ? phrasesKo : phrasesEn
  const currentPhrase = phrases[currentPhraseIndex]

  // 타이핑 효과
  useEffect(() => {
    let timeout: NodeJS.Timeout

    if (!isDeleting && displayedText === currentPhrase) {
      // 완성된 문구를 2초간 유지
      timeout = setTimeout(() => setIsDeleting(true), 2000)
    } else if (isDeleting && displayedText === '') {
      // 다음 문구로 이동
      setIsDeleting(false)
      setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length)
    } else if (isDeleting) {
      // 글자 지우기
      timeout = setTimeout(() => {
        setDisplayedText(currentPhrase.substring(0, displayedText.length - 1))
      }, 50)
    } else {
      // 글자 타이핑
      timeout = setTimeout(() => {
        setDisplayedText(currentPhrase.substring(0, displayedText.length + 1))
      }, 100)
    }

    return () => clearTimeout(timeout)
  }, [displayedText, isDeleting, currentPhrase, phrases.length])

  // 현재 언어로 포스트 필터링
  const filteredPosts = useMemo(() => filterPostsByLanguage(posts, locale), [posts, locale])

  return (
    <>
      {/* Hero Section - Futuristic & Minimal */}
      <motion.div
        className="space-y-8 pt-12 pb-16 md:pt-16 md:pb-20"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="space-y-6">
          <motion.h1
            className="text-3xl leading-tight font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl min-h-[3rem] sm:min-h-[3.5rem] md:min-h-[4rem] lg:min-h-[4.5rem]"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <span className="inline-flex items-center gap-2 sm:gap-3">
              <span className="text-primary-500 dark:text-primary-400 shrink-0">〉</span>
              <span className="bg-linear-to-r from-gray-900 via-gray-700 to-gray-900 dark:from-gray-50 dark:via-gray-300 dark:to-gray-50 bg-clip-text text-transparent">
                {displayedText}
                <span className="inline-block ml-0.5 text-gray-900 dark:text-gray-50 animate-blink">
                  _
                </span>
              </span>
            </span>
          </motion.h1>
          <motion.p
            className="max-w-2xl text-xl leading-relaxed text-gray-600 dark:text-gray-400 md:text-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            {locale === 'ko' ? siteMetadata.description_ko : siteMetadata.description_en}
          </motion.p>
        </div>
      </motion.div>

      {/* Posts Grid - Modern Card Layout */}
      <motion.div className="space-y-6" variants={container} initial="hidden" animate="show">
        {!filteredPosts.length && (
          <motion.div
            className="py-20 text-center text-gray-500 dark:text-gray-400"
            variants={item}
          >
            {t('blog.noPostsFound')}
          </motion.div>
        )}
        {filteredPosts.slice(0, MAX_DISPLAY).map((post, index) => {
          const { slug, date, title, summary, tags } = post as {
            slug: string
            date: string
            title: string
            summary?: string
            tags?: string[]
          }
          return (
            <motion.article
              key={slug}
              className="group relative rounded-2xl border border-white/60 dark:border-gray-700/80 bg-white/70 dark:bg-gray-900/70 backdrop-blur-3xl shadow-xl shadow-gray-900/10 dark:shadow-primary-500/10 p-8 transition-all duration-300 hover:border-primary-500/40 hover:shadow-2xl hover:shadow-primary-500/20 before:absolute before:inset-0 before:rounded-2xl before:bg-linear-to-b before:from-white/40 before:to-transparent before:pointer-events-none dark:before:from-white/5"
              variants={item}
            >
              <div className="relative space-y-5">
                {/* Date */}
                <motion.time
                  dateTime={date}
                  className="text-sm font-medium text-gray-500 dark:text-gray-500 block"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.1 + 0.2 }}
                >
                  {formatDate(date, locale)}
                </motion.time>

                {/* Title */}
                <motion.h2
                  className="text-3xl font-bold tracking-tight md:text-4xl"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 + 0.3 }}
                >
                  <Link
                    href={`/blog/${slug}`}
                    className="text-gray-900 dark:text-gray-50 transition-colors group-hover:text-primary-500 dark:group-hover:text-primary-400"
                  >
                    <motion.span
                      className="inline-block"
                      whileHover={{ x: 5 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                    >
                      {title}
                    </motion.span>
                  </Link>
                </motion.h2>

                {/* Tags */}
                {tags && tags.length > 0 && (
                  <motion.div
                    className="flex flex-wrap gap-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.1 + 0.4 }}
                  >
                    {tags.map((tag, tagIndex) => (
                      <motion.div
                        key={tag}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                          delay: index * 0.1 + 0.4 + tagIndex * 0.05,
                          type: 'spring',
                          stiffness: 200,
                        }}
                      >
                        <Tag text={tag} />
                      </motion.div>
                    ))}
                  </motion.div>
                )}

                {/* Summary */}
                <motion.p
                  className="text-lg leading-relaxed text-gray-600 dark:text-gray-400"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.1 + 0.5 }}
                >
                  {summary}
                </motion.p>

                {/* Read More Link */}
                <motion.div
                  className="pt-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.1 + 0.6 }}
                >
                  <Link
                    href={`/blog/${slug}`}
                    className="group inline-flex items-center gap-2 font-semibold text-primary-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                    aria-label={`Read more: "${title}"`}
                  >
                    {t('blog.readMore')}
                    <svg
                      className="h-4 w-4 transition-transform group-hover:translate-x-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <title>Read more arrow</title>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                  </Link>
                </motion.div>
              </div>
            </motion.article>
          )
        })}
      </motion.div>

      {/* View All Posts Link */}
      {filteredPosts.length > MAX_DISPLAY && (
        <motion.div
          className="flex justify-center pt-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link
              href="/blog"
              className="inline-flex items-center gap-3 rounded-full bg-white/70 dark:bg-gray-800/70 backdrop-blur-3xl border border-white/60 dark:border-gray-600/80 shadow-xl shadow-gray-900/10 dark:shadow-primary-500/10 px-8 py-4 font-semibold text-gray-900 dark:text-gray-100 hover:border-primary-500/50 hover:shadow-2xl hover:shadow-primary-500/20 transition-all before:absolute before:inset-0 before:rounded-full before:bg-linear-to-b before:from-white/40 before:to-transparent before:pointer-events-none dark:before:from-white/5 relative"
              aria-label="All posts"
            >
              {t('blog.viewAllPosts')}
              <motion.svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
                whileHover={{ x: 3 }}
                transition={{ type: 'spring', stiffness: 400, damping: 10 }}
              >
                <title>View all posts arrow</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </motion.svg>
            </Link>
          </motion.div>
        </motion.div>
      )}
    </>
  )
}
