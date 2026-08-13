import { count } from 'drizzle-orm'
import PostList, { type PostListItem } from '@/components/admin/PostList'
import { listAdminPosts } from '@/lib/admin/post-service'
import { getDb } from '@/lib/db/client'
import { posts } from '@/lib/db/schema'

export const metadata = { title: '글 관리' }

export default async function AdminPostListPage(props: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await props.searchParams
  const filter =
    status === 'draft' || status === 'published' || status === 'private' || status === 'archived'
      ? status
      : undefined

  const db = getDb()
  const [rows, countRows] = await Promise.all([
    listAdminPosts(filter),
    db.select({ status: posts.status, count: count() }).from(posts).groupBy(posts.status),
  ])

  const counts = Object.fromEntries(countRows.map((r) => [r.status, r.count]))

  const items: PostListItem[] = rows.map((post) => ({
    id: post.id,
    slug: post.slug,
    status: post.status,
    tags: post.tags,
    date: post.date ? post.date.toISOString() : null,
    title: post.title,
  }))

  return <PostList items={items} filter={filter} counts={counts} />
}
