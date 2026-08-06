'use client'

import { Icon } from '@iconify/react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AdminButton,
  type PostStatus,
  STATUS_LABEL,
  StatusBadge,
} from '@/components/admin/ui/primitives'

export interface PostListItem {
  id: string
  slug: string
  status: PostStatus
  tags: string[]
  date: string | null
  title: string
}

interface PostListProps {
  items: PostListItem[]
  filter?: PostStatus
  counts: Record<string, number>
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

const TABS: Array<{ key: 'all' | PostStatus; label: string }> = [
  { key: 'all', label: '전체' },
  { key: 'draft', label: STATUS_LABEL.draft },
  { key: 'published', label: STATUS_LABEL.published },
  { key: 'archived', label: STATUS_LABEL.archived },
]

export default function PostList({ items, filter, counts }: PostListProps) {
  const router = useRouter()
  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      <div className="flex flex-wrap items-end justify-between gap-4 pt-6">
        <h1 className="text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
          <span className="block bg-linear-to-r from-gray-900 via-gray-700 to-gray-900 bg-clip-text text-transparent dark:from-gray-50 dark:via-gray-300 dark:to-gray-50">
            글 관리
          </span>
        </h1>
        <AdminButton variant="primary" onClick={() => router.push('/admin/new')}>
          <Icon icon="solar:pen-new-square-bold" className="size-4" />새 글 작성
        </AdminButton>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TABS.map((tab) => {
          const active = (tab.key === 'all' && !filter) || tab.key === filter
          const count = tab.key === 'all' ? total : (counts[tab.key] ?? 0)
          return (
            <Link
              key={tab.key}
              href={tab.key === 'all' ? '/admin' : `/admin?status=${tab.key}`}
              className={
                active
                  ? 'rounded-full bg-primary-500/10 px-4 py-2 text-sm font-semibold text-primary-600 dark:text-primary-400'
                  : 'rounded-full px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-900/5 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-200'
              }
            >
              {tab.label}
              <span className="ml-1.5 text-xs opacity-60">{count}</span>
            </Link>
          )
        })}
      </div>

      {items.length === 0 ? (
        <div className="relative rounded-2xl border border-white/60 bg-white/70 shadow-xl shadow-gray-900/10 backdrop-blur-3xl before:absolute before:inset-0 before:rounded-2xl before:bg-linear-to-b before:from-white/40 before:to-transparent before:pointer-events-none dark:border-gray-700/80 dark:bg-gray-900/70 dark:shadow-primary-500/10 dark:before:from-white/5">
          <div className="relative flex flex-col items-center gap-4 py-16 text-center">
            <Icon
              icon="solar:document-add-linear"
              className="size-12 text-gray-300 dark:text-gray-600"
            />
            <p className="text-gray-500 dark:text-gray-400">
              {filter ? `'${STATUS_LABEL[filter]}' 상태의 글이 없습니다.` : '아직 글이 없습니다.'}
            </p>
            {!filter && (
              <AdminButton variant="primary" onClick={() => router.push('/admin/new')}>
                <Icon icon="solar:pen-new-square-bold" className="size-4" />첫 글 작성하기
              </AdminButton>
            )}
          </div>
        </div>
      ) : (
        <motion.ul variants={container} initial="hidden" animate="show" className="space-y-4">
          {items.map((post) => (
            <motion.li key={post.id} variants={item}>
              <Link
                href={`/admin/${post.id}`}
                className="group relative block rounded-2xl border border-white/60 bg-white/70 shadow-xl shadow-gray-900/10 backdrop-blur-3xl transition-all duration-300 before:absolute before:inset-0 before:rounded-2xl before:bg-linear-to-b before:from-white/40 before:to-transparent before:pointer-events-none hover:border-primary-500/40 hover:shadow-2xl hover:shadow-primary-500/20 dark:border-gray-700/80 dark:bg-gray-900/70 dark:shadow-primary-500/10 dark:before:from-white/5"
              >
                <div className="relative flex items-center justify-between gap-4 p-5">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-gray-900 transition-colors group-hover:text-primary-500 dark:text-gray-50 dark:group-hover:text-primary-400">
                      {post.title}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400">
                      /{post.slug}
                      {post.tags.length > 0 && (
                        <span className="text-gray-400 dark:text-gray-500">
                          {' '}
                          · {post.tags.join(', ')}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {post.date && (
                      <span className="hidden text-sm font-medium text-gray-400 sm:inline dark:text-gray-500">
                        {post.date.slice(0, 10)}
                      </span>
                    )}
                    <StatusBadge status={post.status} />
                    <Icon
                      icon="solar:alt-arrow-right-linear"
                      className="size-4 text-gray-300 transition-transform group-hover:translate-x-1 group-hover:text-primary-500 dark:text-gray-600"
                    />
                  </div>
                </div>
              </Link>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </motion.div>
  )
}
