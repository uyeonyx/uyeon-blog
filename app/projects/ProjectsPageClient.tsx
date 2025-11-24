'use client'

import { allProjects } from 'contentlayer/generated'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import ProjectCard from '@/components/ProjectCard'
import { useI18n } from '@/lib/i18n/i18n-context'

export default function ProjectsPageClient() {
  const { t, locale } = useI18n()
  const [openProjectSlug, setOpenProjectSlug] = useState<string | null>(null)

  // 현재 언어에 맞는 프로젝트 필터링
  const projects = allProjects.filter((project) => project.language === locale)

  // URL query parameter에서 초기 상태 설정 및 popstate 처리
  useEffect(() => {
    const updateFromUrl = () => {
      const url = new URL(window.location.href)
      const projectParam = url.searchParams.get('project')
      if (projectParam && projects.some((p) => p.slug === projectParam)) {
        setOpenProjectSlug(projectParam)
      } else {
        setOpenProjectSlug(null)
      }
    }

    // 초기 로드
    updateFromUrl()

    // 뒤로가기/앞으로가기 감지
    window.addEventListener('popstate', updateFromUrl)
    return () => window.removeEventListener('popstate', updateFromUrl)
  }, [projects])

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
            <ProjectCard
              key={project.slug}
              project={project}
              isOpen={openProjectSlug === project.slug}
              onOpenChange={(open) => {
                if (open) {
                  // 모달 열기: query parameter 사용
                  const url = new URL(window.location.href)
                  url.searchParams.set('project', project.slug)
                  window.history.pushState({}, '', url.toString())
                  setOpenProjectSlug(project.slug)
                } else {
                  // 모달 닫기: query parameter 제거
                  const url = new URL(window.location.href)
                  url.searchParams.delete('project')
                  url.hash = '' // hash도 제거
                  window.history.pushState({}, '', url.toString())
                  setOpenProjectSlug(null)
                }
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}
