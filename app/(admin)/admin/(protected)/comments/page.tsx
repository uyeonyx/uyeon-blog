import CommentsManager, { type AdminCommentItem } from '@/components/admin/CommentsManager'
import { listCommentsForAdmin } from '@/lib/db/comments'

export const metadata = { title: '댓글 관리' }

// 모더레이션 화면은 항상 최신 상태를 보여야 한다
export const dynamic = 'force-dynamic'

export default async function AdminCommentsPage() {
  const rows = await listCommentsForAdmin()
  const items: AdminCommentItem[] = rows.map((row) => ({
    id: row.id,
    postSlug: row.postSlug,
    postTitle: row.postTitle,
    authorName: row.authorName,
    authorType: row.authorType,
    provider: row.provider,
    bodyMd: row.bodyMd,
    status: row.status,
    isOwner: row.isOwner,
    locale: row.locale,
    createdAt: row.createdAt.toISOString(),
  }))

  return <CommentsManager initialItems={items} />
}
