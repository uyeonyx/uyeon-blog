'use client'

import { motion } from 'framer-motion'
import ProjectCard from '@/components/ProjectCard'
import { useI18n } from '@/lib/i18n/i18n-context'
import type { Project } from '@/lib/types/project'

/** 목록 카드에는 본문이 필요 없다 — 상세는 /projects/[slug] 라우트가 담당 */
export type ProjectListItem = Omit<Project, 'body'>

export default function ProjectsPageClient({ projects }: { projects: ProjectListItem[] }) {
  const { t } = useI18n()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="divide-y divide-gray-200 dark:divide-gray-700"
    >
      <div className="space-y-2 pt-6 pb-8 md:space-y-5">
        <h1 className="text-3xl leading-tight font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl dark:text-gray-100">
          {t('pages.projects.title')}
        </h1>
        <p className="text-lg leading-7 text-gray-500 dark:text-gray-400">
          {t('pages.projects.description')}
        </p>
      </div>
      <div className="container py-12">
        <div className="-m-4 flex flex-wrap">
          {projects.map((project) => (
            <ProjectCard key={project.slug} project={project} />
          ))}
        </div>
      </div>
    </motion.div>
  )
}
