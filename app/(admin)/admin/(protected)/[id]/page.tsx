import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import PostEditor, { type PostEditorData } from '@/components/admin/PostEditor'
import { getDb } from '@/lib/db/client'
import { posts, postTranslations } from '@/lib/db/schema'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const metadata = { title: '글 편집' }

export default async function EditPostPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  if (!UUID_PATTERN.test(id)) notFound()

  const db = getDb()
  const [[post], translations] = await Promise.all([
    db.select().from(posts).where(eq(posts.id, id)),
    db.select().from(postTranslations).where(eq(postTranslations.postId, id)),
  ])
  if (!post) notFound()

  const initial: PostEditorData = {
    id: post.id,
    slug: post.slug,
    status: post.status,
    tags: post.tags,
    layout: post.layout,
    date: post.date ? post.date.toISOString() : null,
    coverImage: (post.images as string[] | null)?.[0] ?? null,
    translations: Object.fromEntries(
      translations.map((t) => [
        t.language,
        { title: t.title, summary: t.summary, contentJson: t.contentJson },
      ])
    ),
  }

  return <PostEditor initial={initial} />
}
