'use client'

import { Icon } from '@iconify/react'
import { motion } from 'framer-motion'
import { useI18n } from '@/lib/i18n/i18n-context'
import Image from './Image'
import Link from './Link'

interface ProjectCardProps {
  project: {
    slug: string
    title: string
    description: string
    imgSrc?: string
    href?: string
    period?: string
    role?: string
    company?: string
    tags?: string[]
  }
}

const META_ROWS = [
  { key: 'period', icon: 'solar:calendar-bold' },
  { key: 'role', icon: 'solar:user-bold' },
  { key: 'company', icon: 'solar:buildings-2-bold' },
] as const

/** 프로젝트 카드 — 상세는 모달이 아니라 실제 라우트(/projects/[slug])로 이동한다 */
const ProjectCard = ({ project }: ProjectCardProps) => {
  const { t } = useI18n()
  const { slug, title, description, imgSrc, href, tags } = project

  return (
    <motion.div
      className="md max-w-[544px] p-4 md:w-1/2"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      {/* stretched-link 패턴 — 카드 전체 클릭은 절대배치 오버레이 Link가 받고,
          외부링크 버튼은 z-20으로 그 위에 뜬다 (a 안에 button을 넣으면 HTML 무효) */}
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="group relative h-full overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-xl shadow-gray-900/10 backdrop-blur-3xl transition-all duration-300 before:pointer-events-none before:absolute before:inset-0 before:rounded-2xl before:bg-linear-to-b before:from-white/40 before:to-transparent hover:border-primary-500/40 hover:shadow-2xl hover:shadow-primary-500/20 dark:border-gray-700/80 dark:bg-gray-900/70 dark:shadow-primary-500/10 dark:before:from-white/5"
      >
        <Link
          href={`/projects/${slug}`}
          aria-label={title}
          className="absolute inset-0 z-10 cursor-pointer rounded-2xl"
        />
        {imgSrc && (
          <Image
            alt={title}
            src={imgSrc}
            className="object-cover object-center transition-transform duration-300 group-hover:scale-105 md:h-36 lg:h-48"
            width={544}
            height={306}
          />
        )}
        <div className="relative p-6">
          <div className="mb-3 flex items-start justify-between gap-2">
            <h2 className="text-2xl leading-8 font-bold tracking-tight text-gray-900 transition-colors group-hover:text-primary-500 dark:text-gray-50 dark:group-hover:text-primary-400">
              {title}
            </h2>
            {href && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  window.open(href, '_blank', 'noopener,noreferrer')
                }}
                className="relative z-20 shrink-0 text-primary-500 transition-all hover:scale-110 hover:text-primary-600 active:scale-95 dark:hover:text-primary-400"
                aria-label={`Open ${title} in new tab`}
              >
                <Icon icon="solar:link-bold" className="size-6" />
              </button>
            )}
          </div>

          {META_ROWS.some(({ key }) => project[key]) && (
            <div className="mb-3 space-y-1 text-sm text-gray-600 dark:text-gray-400">
              {META_ROWS.map(({ key, icon }) =>
                project[key] ? (
                  <div key={key} className="flex items-center gap-2">
                    <Icon icon={icon} className="size-4" />
                    <span>{project[key]}</span>
                  </div>
                ) : null
              )}
            </div>
          )}

          <p className="prose mb-3 line-clamp-3 max-w-none text-gray-500 dark:text-gray-400">
            {description}
          </p>

          {tags && tags.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {tags.slice(0, 5).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-primary-100/80 px-3 py-1 text-xs font-medium text-primary-700 backdrop-blur-sm dark:bg-primary-900/30 dark:text-primary-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="inline-flex items-center gap-2 text-base leading-6 font-semibold text-primary-500 transition-colors group-hover:text-primary-600 dark:group-hover:text-primary-400">
            {t('pages.projects.viewDetails')}
            <svg
              className="h-4 w-4 transition-transform group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default ProjectCard
