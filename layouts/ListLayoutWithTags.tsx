'use client'

import tagData from 'app/tag-data.json'
import type { Blog } from 'contentlayer/generated'
import { motion } from 'framer-motion'
import { slug } from 'github-slugger'
import { usePathname } from 'next/navigation'
import type { CoreContent } from 'pliny/utils/contentlayer'
import { useMemo } from 'react'
import Link from '@/components/Link'
import Tag from '@/components/Tag'
import { filterPostsByLanguage } from '@/lib/i18n/filter-posts'
import { useI18n } from '@/lib/i18n/i18n-context'
import { translateTag } from '@/lib/i18n/tag-translations'
import { formatDate } from '@/lib/i18n/utils'

interface PaginationProps {
  totalPages: number
  currentPage: number
}
interface ListLayoutProps {
  posts: CoreContent<Blog>[]
  title: string
  initialDisplayPosts?: CoreContent<Blog>[]
  pagination?: PaginationProps
}

function Pagination({ totalPages, currentPage }: PaginationProps) {
  const pathname = usePathname()
  const { t } = useI18n()
  const segments = pathname.split('/')
  const _lastSegment = segments[segments.length - 1]
  const basePath = pathname
    .replace(/^\//, '') // Remove leading slash
    .replace(/\/page\/\d+\/?$/, '') // Remove any trailing /page
    .replace(/\/$/, '') // Remove trailing slash
  const prevPage = currentPage - 1 > 0
  const nextPage = currentPage + 1 <= totalPages

  return (
    <div className="pt-8 pb-8">
      <nav className="flex items-center justify-between gap-4">
        {prevPage ? (
          <Link
            href={currentPage - 1 === 1 ? `/${basePath}/` : `/${basePath}/page/${currentPage - 1}`}
            rel="prev"
            className="inline-flex items-center gap-2 rounded-full bg-white/70 dark:bg-gray-800/70 backdrop-blur-3xl border border-white/60 dark:border-gray-600/80 shadow-xl shadow-gray-900/10 dark:shadow-primary-500/10 px-6 py-3 font-semibold text-gray-900 dark:text-gray-100 transition-all hover:scale-105 hover:border-primary-500/50"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <title>{t('pagination.previous')}</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16l-4-4m0 0l4-4m-4 4h18"
              />
            </svg>
            {t('pagination.previous')}
          </Link>
        ) : (
          <div className="inline-flex items-center gap-2 rounded-full bg-white/40 dark:bg-gray-900/40 backdrop-blur-2xl border border-white/40 dark:border-gray-700/40 px-6 py-3 font-semibold text-gray-400 dark:text-gray-600">
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <title>{t('pagination.previous')}</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16l-4-4m0 0l4-4m-4 4h18"
              />
            </svg>
            {t('pagination.previous')}
          </div>
        )}
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {currentPage} / {totalPages}
        </span>
        {nextPage ? (
          <Link
            href={`/${basePath}/page/${currentPage + 1}`}
            rel="next"
            className="inline-flex items-center gap-2 rounded-full bg-white/70 dark:bg-gray-800/70 backdrop-blur-3xl border border-white/60 dark:border-gray-600/80 shadow-xl shadow-gray-900/10 dark:shadow-primary-500/10 px-6 py-3 font-semibold text-gray-900 dark:text-gray-100 transition-all hover:scale-105 hover:border-primary-500/50"
          >
            {t('pagination.next')}
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <title>{t('pagination.next')}</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </Link>
        ) : (
          <div className="inline-flex items-center gap-2 rounded-full bg-white/40 dark:bg-gray-900/40 backdrop-blur-2xl border border-white/40 dark:border-gray-700/40 px-6 py-3 font-semibold text-gray-400 dark:text-gray-600">
            {t('pagination.next')}
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <title>{t('pagination.next')}</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </div>
        )}
      </nav>
    </div>
  )
}

export default function ListLayoutWithTags({
  posts,
  title,
  initialDisplayPosts = [],
  pagination,
}: ListLayoutProps) {
  const pathname = usePathname()
  const { locale, t } = useI18n()

  // 언어별로 포스트 필터링
  const filteredPosts = useMemo(
    // biome-ignore lint/suspicious/noExplicitAny: Contentlayer types will include language at runtime
    () => filterPostsByLanguage(posts as any, locale) as CoreContent<Blog>[],
    [posts, locale]
  )

  const filteredInitialDisplayPosts = useMemo(
    // biome-ignore lint/suspicious/noExplicitAny: Contentlayer types will include language at runtime
    () => filterPostsByLanguage(initialDisplayPosts as any, locale) as CoreContent<Blog>[],
    [initialDisplayPosts, locale]
  )

  const tagCounts = tagData as Record<string, number>
  const tagKeys = Object.keys(tagCounts)
  const sortedTags = tagKeys.sort((a, b) => tagCounts[b] - tagCounts[a])

  const displayPosts =
    filteredInitialDisplayPosts.length > 0 ? filteredInitialDisplayPosts : filteredPosts

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      {/* Page Title */}
      <div className="pt-12 pb-12">
        <h1 className="text-3xl leading-tight font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
          <span className="block bg-linear-to-r from-gray-900 via-gray-700 to-gray-900 dark:from-gray-50 dark:via-gray-300 dark:to-gray-50 bg-clip-text text-transparent">
            {title}
          </span>
        </h1>
      </div>

      <div className="flex gap-12">
        {/* Sidebar - Tags Navigation */}
        <aside className="hidden lg:block lg:w-64 xl:w-72">
          <div className="sticky top-24 rounded-2xl border border-white/60 dark:border-gray-700/80 bg-white/70 dark:bg-gray-900/70 backdrop-blur-3xl shadow-xl shadow-gray-900/10 dark:shadow-primary-500/10 p-6 before:absolute before:inset-0 before:rounded-2xl before:bg-linear-to-b before:from-white/40 before:to-transparent before:pointer-events-none dark:before:from-white/5">
            <div className="space-y-6">
              {pathname.startsWith('/blog') ? (
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary-500">
                  {t('blog.allPosts')}
                </h3>
              ) : (
                <Link
                  href={`/blog`}
                  className="block text-sm font-bold uppercase tracking-wider text-gray-600 hover:text-primary-500 dark:text-gray-400 dark:hover:text-primary-400 transition-colors"
                >
                  {t('blog.allPosts')}
                </Link>
              )}
              <ul className="space-y-2">
                {sortedTags.map((tagSlug) => {
                  const isActive = decodeURI(pathname.split('/tags/')[1]) === slug(tagSlug)
                  const displayName = translateTag(tagSlug, locale)
                  return (
                    <li key={tagSlug}>
                      {isActive ? (
                        <span className="inline-flex items-center rounded-lg bg-primary-500/10 px-3 py-2 text-sm font-semibold text-primary-600 dark:text-primary-400">
                          {displayName} ({tagCounts[tagSlug]})
                        </span>
                      ) : (
                        <Link
                          href={`/tags/${slug(tagSlug)}`}
                          className="inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-primary-500 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-primary-400 transition-all"
                          aria-label={`View posts tagged ${displayName}`}
                        >
                          {displayName} ({tagCounts[tagSlug]})
                        </Link>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </aside>

        {/* Main Content - Posts List */}
        <div className="flex-1 min-w-0">
          <div className="space-y-6">
            {displayPosts.map((post) => {
              const { path, date, title, summary, tags } = post
              return (
                <article
                  key={path}
                  className="group relative rounded-2xl border border-white/60 dark:border-gray-700/80 bg-white/70 dark:bg-gray-900/70 backdrop-blur-3xl shadow-xl shadow-gray-900/10 dark:shadow-primary-500/10 p-8 transition-all duration-300 hover:border-primary-500/40 hover:shadow-2xl hover:shadow-primary-500/20 before:absolute before:inset-0 before:rounded-2xl before:bg-linear-to-b before:from-white/40 before:to-transparent before:pointer-events-none dark:before:from-white/5"
                >
                  <div className="space-y-4">
                    {/* Date */}
                    <time
                      dateTime={date}
                      suppressHydrationWarning
                      className="text-sm font-medium text-gray-500 dark:text-gray-500"
                    >
                      {formatDate(date, locale)}
                    </time>

                    {/* Title */}
                    <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                      <Link
                        href={`/${path}`}
                        className="text-gray-900 dark:text-gray-50 transition-colors group-hover:text-primary-500 dark:group-hover:text-primary-400"
                      >
                        {title}
                      </Link>
                    </h2>

                    {/* Tags */}
                    {tags?.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag) => (
                          <Tag key={tag} text={tag} />
                        ))}
                      </div>
                    )}

                    {/* Summary */}
                    {summary && (
                      <p className="text-lg leading-relaxed text-gray-600 dark:text-gray-400">
                        {summary}
                      </p>
                    )}
                  </div>
                </article>
              )
            })}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <Pagination currentPage={pagination.currentPage} totalPages={pagination.totalPages} />
          )}
        </div>
      </div>
    </motion.div>
  )
}
