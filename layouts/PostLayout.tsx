'use client'

import type { Authors, Blog } from 'contentlayer/generated'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import type { CoreContent } from 'pliny/utils/contentlayer'
import type { ReactNode } from 'react'
import { useRef } from 'react'
import Comments from '@/components/Comments'
import FloatingTOC from '@/components/FloatingTOC'
import Link from '@/components/Link'
import ScrollTopAndComment from '@/components/ScrollTopAndComment'
import SectionContainer from '@/components/SectionContainer'
import Tag from '@/components/Tag'
import siteMetadata from '@/data/siteMetadata'
import { useI18n } from '@/lib/i18n/i18n-context'
import { formatDate } from '@/lib/i18n/utils'

const editUrl = (path) => `${siteMetadata.siteRepo}/blob/main/data/${path}`

interface LayoutProps {
  content: CoreContent<Blog>
  authorDetails: CoreContent<Authors>[]
  next?: { path: string; title: string }
  prev?: { path: string; title: string }
  children: ReactNode
}

function AuthorAvatar({ author, locale }: { author: CoreContent<Authors>; locale: string }) {
  const { t } = useI18n()
  const cardRef = useRef<HTMLDivElement>(null)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [10, -10]), {
    stiffness: 300,
    damping: 30,
  })
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-10, 10]), {
    stiffness: 300,
    damping: 30,
  })

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const percentX = (e.clientX - centerX) / (rect.width / 2)
    const percentY = (e.clientY - centerY) / (rect.height / 2)
    mouseX.set(percentX)
    mouseY.set(percentY)
  }

  const handleMouseLeave = () => {
    mouseX.set(0)
    mouseY.set(0)
  }

  return (
    <Link href={`/about`} className="block">
      <motion.div
        ref={cardRef}
        className="group relative cursor-pointer"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        whileHover={{ scale: 1.05 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        style={{
          transformStyle: 'preserve-3d',
          perspective: 1000,
        }}
      >
        <motion.div
          className="relative"
          style={{
            rotateX,
            rotateY,
            transformStyle: 'preserve-3d',
          }}
        >
          <img
            src={author.avatar}
            alt={`${author.name} ${t('blog.profilePhoto')}`}
            className="h-14 w-14 shrink-0 rounded-full ring-2 ring-gray-200 shadow-lg dark:ring-gray-700 xl:h-32 xl:w-32 xl:ring-4 xl:ring-gray-100 xl:shadow-xl xl:dark:ring-gray-900"
          />
          {/* Subtle shine on hover */}
          <motion.div
            className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%)',
            }}
          />
        </motion.div>
      </motion.div>
    </Link>
  )
}

export default function PostLayout({ content, authorDetails, next, prev, children }: LayoutProps) {
  const { filePath, path, date, title, tags, toc } = content
  const basePath = path.split('/')[0]
  const { t, locale } = useI18n()

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <SectionContainer>
        <ScrollTopAndComment />
        {toc && <FloatingTOC toc={toc} />}
        <article>
          <div className="xl:divide-y-0">
            <header className="pt-12 pb-12 xl:pb-16">
              <div className="space-y-6 text-center">
                <dl className="space-y-4">
                  <div>
                    <dt className="sr-only">{t('blog.publishedOn')}</dt>
                    <dd className="text-sm font-medium text-gray-500 dark:text-gray-500">
                      <time dateTime={date}>{formatDate(date, locale)}</time>
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
              <aside className="pb-8 xl:pb-0 xl:pt-0">
                {/* Authors */}
                <div className="mb-6 xl:mb-8 xl:flex xl:justify-center">
                  <dl>
                    <dt className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 xl:sr-only">
                      {t('blog.author')}
                    </dt>
                    <dd>
                      <ul className="flex flex-col gap-3 xl:gap-8">
                        {authorDetails.map((author) => (
                          <li className="flex items-center gap-3 xl:flex-col xl:items-center" key={author.name}>
                            {author.avatar && <AuthorAvatar author={author} locale={locale} />}
                            <div className="min-w-0 flex-1 text-sm font-medium xl:text-center">
                              <Link href="/about" className="hover:text-primary-500 dark:hover:text-primary-400 transition-colors">
                                <div className="font-semibold text-gray-900 dark:text-gray-100">{author.name}</div>
                              </Link>
                              {author.occupation && (
                                <div className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">{author.occupation}</div>
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
                  <div className="mb-8 xl:flex xl:justify-center">
                    <div>
                      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 xl:mb-3">
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
              {/* Comments Section */}
              {siteMetadata.comments && (
                <div id="comment" className="xl:col-span-4 pb-8">
                  <div className="border-t border-gray-100 dark:border-gray-900 pt-8">
                    <h2 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {t('blog.comments')}
                    </h2>
                    <Comments slug={content.slug} />
                  </div>
                </div>
              )}
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
