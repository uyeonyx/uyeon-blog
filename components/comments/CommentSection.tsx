'use client'

// 댓글은 마운트 후 클라이언트에서 가져온다.
// 글 상세 라우트 자체는 이미 force-dynamic이지만, 댓글을 서버 렌더에 넣으면 본문 응답이
// 댓글 조회를 기다리게 된다. 본문을 먼저 그리고 댓글을 뒤따르게 하는 편이 낫다
// (giscus의 lazy iframe과 같은 타이밍이다).
import { Fragment, useCallback, useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n/i18n-context'
import CommentForm from './CommentForm'
import CommentItem from './CommentItem'
import type { CommentsResponse, PublicComment } from './types'

function countComments(items: PublicComment[]): number {
  return items.reduce(
    (total, item) => total + (item.isDeleted ? 0 : 1) + countComments(item.replies ?? []),
    0
  )
}

export default function CommentSection({ slug }: { slug: string }) {
  const { t, locale } = useI18n()

  const [data, setData] = useState<CommentsResponse | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const returnPath = `/${locale}/blog/${slug}`

  // 익명 여부와 무관하게 권한은 서버가 쿠키로 판정해 canEdit·canDelete로 내려준다
  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/comments?slug=${encodeURIComponent(slug)}`)
      if (!response.ok) throw new Error('failed')
      setData((await response.json()) as CommentsResponse)
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }, [slug])

  useEffect(() => {
    load()
  }, [load])

  const handlePosted = useCallback(() => {
    setReplyTo(null)
    load()
  }, [load])

  const handleSavedEdit = useCallback(() => {
    setEditingId(null)
    load()
  }, [load])

  const handleDelete = useCallback(
    async (commentId: string) => {
      if (!window.confirm(t('comments.deleteConfirm'))) return
      setDeletingId(commentId)
      try {
        const response = await fetch(`/api/comments/${commentId}`, { method: 'DELETE' })
        if (!response.ok) {
          window.alert(t('comments.error.deleteFailed'))
          return
        }
        // 지운 댓글을 편집 중이었다면 폼도 닫는다
        setEditingId((current) => (current === commentId ? null : current))
        await load()
      } catch {
        window.alert(t('comments.error.deleteFailed'))
      } finally {
        setDeletingId(null)
      }
    },
    [load, t]
  )

  if (status === 'loading') {
    return <p className="text-sm text-gray-500 dark:text-gray-400">{t('comments.loading')}</p>
  }

  if (status === 'error' || !data) {
    return (
      <div className="text-sm">
        <p className="mb-2 text-gray-500 dark:text-gray-400">{t('comments.loadError')}</p>
        <button
          type="button"
          onClick={load}
          className="font-medium text-primary-500 hover:text-primary-600 dark:text-primary-400"
        >
          {t('comments.retry')}
        </button>
      </div>
    )
  }

  const total = countComments(data.items)

  return (
    <div className="space-y-6">
      <CommentForm
        slug={slug}
        viewer={data.viewer}
        anonymousAllowed={data.anonymousAllowed}
        returnPath={returnPath}
        onPosted={handlePosted}
        onSignedOut={load}
      />

      {total > 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {t('comments.count', { count: total })}
        </p>
      )}

      {data.items.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('comments.empty')}</p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {data.items.map((comment) => (
            // ul의 직계 자식은 li여야 하므로 답글 폼도 별도 li로 내보낸다
            <Fragment key={comment.id}>
              <CommentItem
                comment={comment}
                onReply={setReplyTo}
                onDelete={handleDelete}
                onEdit={setEditingId}
                onCancelEdit={() => setEditingId(null)}
                onSavedEdit={handleSavedEdit}
                editingId={editingId}
                deletingId={deletingId}
              />
              {replyTo === comment.id && (
                <li className="pb-4 pl-11">
                  <CommentForm
                    slug={slug}
                    parentId={comment.id}
                    viewer={data.viewer}
                    anonymousAllowed={data.anonymousAllowed}
                    returnPath={returnPath}
                    onPosted={handlePosted}
                    onSignedOut={load}
                    onCancel={() => setReplyTo(null)}
                    autoFocus
                  />
                </li>
              )}
            </Fragment>
          ))}
        </ul>
      )}
    </div>
  )
}
