'use client'

import { allProjects } from 'contentlayer/generated'
import { motion } from 'framer-motion'
import Card from '@/components/Card'
import { useI18n } from '@/lib/i18n/i18n-context'

export default function ProjectsPageClient() {
  const { t, locale } = useI18n()

  // 현재 언어에 맞는 프로젝트 필터링
  const projects = allProjects.filter((project) => project.language === locale)

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
            <Card
              key={project.slug}
              title={project.title}
              description={project.description}
              imgSrc={project.imgSrc}
              href={project.href}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}
