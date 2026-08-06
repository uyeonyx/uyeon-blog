import { count, desc, eq } from 'drizzle-orm'
import PostList, { type PostListItem } from '@/components/admin/PostList'
import { getDb } from '@/lib/db/client'
import { posts, postTranslations } from '@/lib/db/schema'

export const metadata = { title: '글 관리' }

export default async function AdminPostListPage(props: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await props.searchParams
  const filter =
    status === 'draft' || status === 'published' || status === 'archived' ? status : undefined

  const db = getDb()
  const [rows, translations, countRows] = await Promise.all([
    db
      .select()
      .from(posts)
      .where(filter ? eq(posts.status, filter) : undefined)
      .orderBy(desc(posts.updatedAt)),
    db.select().from(postTranslations),
    db.select({ status: posts.status, count: count() }).from(posts).groupBy(posts.status),
  ])

  const counts = Object.fromEntries(countRows.map((r) => [r.status, r.count]))

  const items: PostListItem[] = rows.map((post) => {
    const trs = translations.filter((t) => t.postId === post.id)
    const ko = trs.find((t) => t.language === 'ko')
    const en = trs.find((t) => t.language === 'en')
    return {
      id: post.id,
      slug: post.slug,
      status: post.status,
      tags: post.tags,
      date: post.date ? post.date.toISOString() : null,
      title: ko?.title || en?.title || '(제목 없음)',
    }
  })

  return <PostList items={items} filter={filter} counts={counts} />
}
