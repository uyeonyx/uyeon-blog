'use client'

import type { Authors, Blog } from 'contentlayer/generated'
import { motion } from 'framer-motion'
import type { CoreContent } from 'pliny/utils/contentlayer'
import type { ReactNode } from 'react'
import Image from '@/components/Image'
import Link from '@/components/Link'
import ScrollTopAndComment from '@/components/ScrollTopAndComment'
import SectionContainer from '@/components/SectionContainer'
import Tag from '@/components/Tag'
import siteMetadata from '@/data/siteMetadata'
import { useI18n } from '@/lib/i18n/i18n-context'

const editUrl = (path) => `${siteMetadata.siteRepo}/blob/main/data/${path}`

const postDateTemplate: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
}

interface LayoutProps {
  content: CoreContent<Blog>
  authorDetails: CoreContent<Authors>[]
  next?: { path: string; title: string }
  prev?: { path: string; title: string }
  children: ReactNode
}

export default function PostLayout({ content, authorDetails, next, prev, children }: LayoutProps) {
  const { filePath, path, date, title, tags } = content
  const basePath = path.split('/')[0]
  const { t } = useI18n()

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <SectionContainer>
        <ScrollTopAndComment />
        <article>
          <div className="xl:divide-y-0">
            <header className="pt-12 pb-12 xl:pb-16">
              <div className="space-y-6 text-center">
                <dl className="space-y-4">
                  <div>
                    <dt className="sr-only">{t('blog.publishedOn')}</dt>
                    <dd className="text-sm font-medium text-gray-500 dark:text-gray-500">
                      <time dateTime={date}>
                        {new Date(date).toLocaleDateString(siteMetadata.locale, postDateTemplate)}
                      </time>
                    </dd>
                  </div>
                </dl>
                <div>
                  <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
                    <span className="bg-linear-to-r from-gray-900 via-gray-700 to-gray-900 dark:from-gray-50 dark:via-gray-300 dark:to-gray-50 bg-clip-text text-transparent">
                      {title}
                    </span>
                  </h1>
                </div>
              </div>
            </header>
            <div className="grid-rows-[auto_1fr] pb-8 xl:grid xl:grid-cols-4 xl:gap-x-12">
              {/* Sidebar */}
              <aside className="pb-10 xl:pb-0 xl:pt-0">
                {/* Authors */}
                <div className="mb-8 flex justify-center xl:block">
                  <dl>
                    <dt className="sr-only">{t('blog.authors')}</dt>
                    <dd>
                      <ul className="flex flex-wrap justify-center gap-6 xl:flex-col xl:gap-8">
                        {authorDetails.map((author) => (
                          <li className="flex flex-col items-center gap-2" key={author.name}>
                            {author.avatar && (
                              <Image
                                src={author.avatar}
                                width={48}
                                height={48}
                                alt="avatar"
                                className="h-12 w-12 rounded-full ring-2 ring-gray-100 dark:ring-gray-900"
                              />
                            )}
                            <div className="text-sm font-medium text-center">
                              <div className="text-gray-900 dark:text-gray-100">{author.name}</div>
                              {author.twitter && (
                                <Link
                                  href={author.twitter}
                                  className="text-primary-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                                >
                                  {author.twitter
                                    .replace('https://twitter.com/', '@')
                                    .replace('https://x.com/', '@')}
                                </Link>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </dd>
                  </dl>
                </div>

                {/* Tags */}
                {tags && (
                  <div className="mb-8 flex justify-center xl:block">
                    <div>
                      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-500">
                        {t('blog.tags')}
                      </h2>
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag) => (
                          <Tag key={tag} text={tag} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </aside>

              {/* Main Content */}
              <div className="xl:col-span-3">
                <div className="prose dark:prose-invert max-w-none prose-lg pb-8">{children}</div>

                {/* Footer Actions */}
                <div className="border-t border-gray-100 dark:border-gray-900 pt-6 pb-6">
                  <div className="flex flex-wrap gap-4 text-sm">
                    <Link
                      href={editUrl(filePath)}
                      className="text-gray-600 hover:text-primary-500 dark:text-gray-400 dark:hover:text-primary-400 transition-colors"
                    >
                      {t('blog.viewOnGithub')}
                    </Link>
                  </div>
                </div>
              </div>
              {/* Navigation Footer */}
              <footer className="xl:col-span-4">
                <div className="border-t border-gray-100 dark:border-gray-900 pt-8">
                  {(next || prev) && (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 pb-8">
                      {prev?.path && (
                        <div className="group relative rounded-xl border border-white/60 dark:border-gray-700/80 bg-white/70 dark:bg-gray-900/70 backdrop-blur-3xl shadow-xl shadow-gray-900/10 dark:shadow-primary-500/10 p-6 transition-all hover:border-primary-500/40 hover:shadow-2xl hover:shadow-primary-500/20 before:absolute before:inset-0 before:rounded-xl before:bg-linear-to-b before:from-white/40 before:to-transparent before:pointer-events-none dark:before:from-white/5">
                          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-500">
                            {t('blog.previous')}
                          </h2>
                          <Link
                            href={`/${prev.path}`}
                            className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary-500 dark:group-hover:text-primary-400 transition-colors"
                          >
                            {prev.title}
                          </Link>
                        </div>
                      )}
                      {next?.path && (
                        <div className="group relative rounded-xl border border-white/60 dark:border-gray-700/80 bg-white/70 dark:bg-gray-900/70 backdrop-blur-3xl shadow-xl shadow-gray-900/10 dark:shadow-primary-500/10 p-6 transition-all hover:border-primary-500/40 hover:shadow-2xl hover:shadow-primary-500/20 before:absolute before:inset-0 before:rounded-xl before:bg-linear-to-b before:from-white/40 before:to-transparent before:pointer-events-none dark:before:from-white/5">
                          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-500">
                            {t('blog.next')}
                          </h2>
                          <Link
                            href={`/${next.path}`}
                            className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary-500 dark:group-hover:text-primary-400 transition-colors"
                          >
                            {next.title}
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex justify-center pb-8">
                    <Link
                      href={`/${basePath}`}
                      className="inline-flex items-center gap-2 rounded-full bg-white/70 dark:bg-gray-800/70 backdrop-blur-3xl border border-white/60 dark:border-gray-600/80 shadow-xl shadow-gray-900/10 dark:shadow-primary-500/10 px-6 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100 transition-all hover:scale-105 hover:border-primary-500/50"
                      aria-label={t('blog.backToBlog')}
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <title>{t('blog.backToBlog')}</title>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16l-4-4m0 0l4-4m-4 4h18"
                        />
                      </svg>
                      {t('blog.backToBlog')}
                    </Link>
                  </div>
                </div>
              </footer>
            </div>
          </div>
        </article>
      </SectionContainer>
    </motion.div>
  )
}
