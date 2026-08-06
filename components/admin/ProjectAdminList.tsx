'use client'

import { Icon } from '@iconify/react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { GlassCard } from './ui/primitives'

export interface ProjectAdminItem {
  id: string
  slug: string
  title: string
  published: boolean
  displayOrder: number
  compileOk: { ko: boolean; en: boolean }
}

export default function ProjectAdminList({ items }: { items: ProjectAdminItem[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          프로젝트 관리
        </h1>
        <Link
          href="/admin/projects/new"
          className="inline-flex items-center gap-1.5 rounded-full bg-primary-500/90 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-primary-500/30 transition-all hover:scale-105 hover:bg-primary-500 active:scale-95"
        >
          <Icon icon="solar:add-circle-bold" className="size-4" />새 프로젝트
        </Link>
      </div>

      <GlassCard innerClassName="divide-y divide-gray-200/60 dark:divide-gray-700/60">
        {items.length === 0 && (
          <p className="p-6 text-sm text-gray-500 dark:text-gray-400">프로젝트가 없습니다.</p>
        )}
        {items.map((project) => (
          <Link
            key={project.id}
            href={`/admin/projects/${project.id}`}
            className="flex items-center gap-3 p-4 transition-colors hover:bg-gray-900/5 dark:hover:bg-white/5"
          >
            <span className="w-8 shrink-0 text-center text-xs font-semibold text-gray-400 dark:text-gray-500">
              {project.displayOrder}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-gray-900 dark:text-gray-100">
                {project.title}
              </p>
              <p className="truncate text-xs text-gray-500 dark:text-gray-400">/{project.slug}</p>
            </div>
            {!(project.compileOk.ko && project.compileOk.en) && (
              <span className="text-amber-500" title="컴파일 실패한 언어가 있습니다">
                <Icon icon="solar:danger-triangle-bold" className="size-4" />
              </span>
            )}
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                project.published
                  ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                  : 'bg-gray-500/10 text-gray-500 dark:text-gray-400'
              }`}
            >
              {project.published ? '공개' : '비공개'}
            </span>
          </Link>
        ))}
      </GlassCard>
    </motion.div>
  )
}
