// 프로젝트 상세 — 서버 컴포넌트. 본문 MDX는 서버에서 평가한다 (MDXServerRenderer).
// 예전 ProjectCard 모달(DialogContent) 내부 UI를 실제 페이지로 옮긴 것 — 일반 heading anchor가
// 그대로 동작하므로 모달용 hash 스크롤 기계(ModalHeading)는 필요 없다.
import { Icon } from '@iconify/react'
import Link from '@/components/Link'
import MDXServerRenderer from '@/components/mdx/MDXServerRenderer'
import type { Locale } from '@/lib/i18n/config'
import { getTranslations } from '@/lib/i18n/translate'
import type { Project } from '@/lib/types/project'

const META_ROWS = [
  { key: 'period', icon: 'solar:calendar-bold' },
  { key: 'role', icon: 'solar:user-bold' },
  { key: 'company', icon: 'solar:buildings-2-bold' },
] as const

export default function ProjectDetail({ project, locale }: { project: Project; locale: Locale }) {
  const t = getTranslations(locale)
  const { title, description, href, tags } = project

  return (
    <article className="mx-auto max-w-3xl py-8">
      <header className="border-b border-gray-200 pb-6 dark:border-gray-700">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl leading-tight font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-gray-50">
              {title}
            </h1>
            <p className="mt-3 text-lg text-gray-600 dark:text-gray-400">{description}</p>
          </div>
          {href && (
            <Link
              href={href}
              className="bg-primary-500/90 hover:bg-primary-500 shadow-primary-500/30 inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-lg backdrop-blur-sm transition-all hover:scale-105 active:scale-95"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon icon="solar:link-bold" className="size-5" />
              <span>{t('pages.projects.visit')}</span>
            </Link>
          )}
        </div>

        {META_ROWS.some(({ key }) => project[key]) && (
          <div className="space-y-2.5 pt-5 text-sm">
            {META_ROWS.map(({ key, icon }) =>
              project[key] ? (
                <div key={key} className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <div className="bg-primary-100/80 dark:bg-primary-900/30 flex h-6 w-6 items-center justify-center rounded-md">
                    <Icon
                      icon={icon}
                      className="text-primary-600 dark:text-primary-400 size-4 shrink-0"
                    />
                  </div>
                  <span className="font-medium">{project[key]}</span>
                </div>
              ) : null
            )}
          </div>
        )}

        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="border-primary-200/50 dark:border-primary-800/50 text-primary-700 dark:text-primary-300 rounded-full border bg-white/60 px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur-sm dark:bg-gray-800/60"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </header>

      <div className="prose dark:prose-invert max-w-none pt-8 text-gray-700 dark:text-gray-300">
        <MDXServerRenderer code={project.body.code} />
      </div>

      <div className="pt-10">
        <Link
          href="/projects"
          className="text-primary-500 hover:text-primary-600 dark:hover:text-primary-400 font-medium"
          aria-label={t('pages.projects.title')}
        >
          &larr; {t('pages.projects.title')}
        </Link>
      </div>
    </article>
  )
}
