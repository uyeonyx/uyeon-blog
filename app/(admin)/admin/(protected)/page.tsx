import { desc, eq } from 'drizzle-orm'
import Link from 'next/link'
import { getDb } from '@/lib/db/client'
import { posts, postTranslations } from '@/lib/db/schema'

export const metadata = { title: '글 관리' }

const STATUS_TABS = [
  { key: 'all', label: '전체' },
  { key: 'draft', label: '초안' },
  { key: 'published', label: '게시됨' },
  { key: 'archived', label: '아카이브' },
] as const

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  published: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  archived: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
}

const STATUS_LABEL: Record<string, string> = {
  draft: '초안',
  published: '게시됨',
  archived: '아카이브',
}

export default async function AdminPostListPage(props: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await props.searchParams
  const filter =
    status === 'draft' || status === 'published' || status === 'archived' ? status : undefined

  const db = getDb()
  const [rows, translations] = await Promise.all([
    db
      .select()
      .from(posts)
      .where(filter ? eq(posts.status, filter) : undefined)
      .orderBy(desc(posts.updatedAt)),
    db.select().from(postTranslations),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {STATUS_TABS.map((tab) => {
            const active = (tab.key === 'all' && !filter) || tab.key === filter
            return (
              <Link
                key={tab.key}
                href={tab.key === 'all' ? '/admin' : `/admin?status=${tab.key}`}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  active
                    ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                    : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>
        <Link
          href="/admin/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          새 글 작성
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center text-gray-400 dark:border-gray-700">
          글이 없습니다. 새 글을 작성해보세요.
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
          {rows.map((post) => {
            const ko = translations.find((t) => t.postId === post.id && t.language === 'ko')
            const en = translations.find((t) => t.postId === post.id && t.language === 'en')
            return (
              <li key={post.id}>
                <Link
                  href={`/admin/${post.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900 dark:text-gray-100">
                      {ko?.title || en?.title || '(제목 없음)'}
                    </p>
                    <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                      /{post.slug}
                      {post.tags.length > 0 && ` · ${post.tags.join(', ')}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {post.date && (
                      <span className="text-sm text-gray-400">
                        {post.date.toISOString().slice(0, 10)}
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[post.status]}`}
                    >
                      {STATUS_LABEL[post.status]}
                    </span>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
