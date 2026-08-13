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

const DELETE_TOKEN_PREFIX = 'comment-delete-token:'

/** 익명 작성자의 15분짜리 삭제 권한 — 서버에 컬럼을 두지 않고 브라우저에만 남긴다 */
function readDeleteToken(commentId: string): string | null {
  try {
    return localStorage.getItem(DELETE_TOKEN_PREFIX + commentId)
  } catch {
    return null
  }
}

function storeDeleteToken(commentId: string, token: string) {
  try {
    localStorage.setItem(DELETE_TOKEN_PREFIX + commentId, token)
  } catch {
    // 시크릿 모드 등에서 실패할 수 있다 — 삭제 버튼이 안 보일 뿐 작성은 정상이다
  }
}

function clearDeleteToken(commentId: string) {
  try {
    localStorage.removeItem(DELETE_TOKEN_PREFIX + commentId)
  } catch {
    // 무시
  }
}

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
  const [deletingId, setDeletingId] = useState<string | null>(null)
  // localStorage는 렌더 중에 읽을 수 없으므로(SSR 불일치) 로드 후 상태로 옮긴다
  const [localTokenIds, setLocalTokenIds] = useState<Set<string>>(new Set())

  const returnPath = `/${locale}/blog/${slug}`

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/comments?slug=${encodeURIComponent(slug)}`)
      if (!response.ok) throw new Error('failed')
      const payload = (await response.json()) as CommentsResponse
      setData(payload)
      setStatus('ready')

      const owned = new Set<string>()
      const walk = (items: PublicComment[]) => {
        for (const item of items) {
          if (readDeleteToken(item.id)) owned.add(item.id)
          walk(item.replies ?? [])
        }
      }
      walk(payload.items)
      setLocalTokenIds(owned)
    } catch {
      setStatus('error')
    }
  }, [slug])

  useEffect(() => {
    load()
  }, [load])

  const handlePosted = useCallback(
    ({ commentId, deleteToken }: { commentId: string; deleteToken: string | null }) => {
      if (deleteToken) storeDeleteToken(commentId, deleteToken)
      setReplyTo(null)
      load()
    },
    [load]
  )

  const handleDelete = useCallback(
    async (commentId: string) => {
      if (!window.confirm(t('comments.deleteConfirm'))) return
      setDeletingId(commentId)
      try {
        const token = readDeleteToken(commentId)
        const response = await fetch(`/api/comments/${commentId}`, {
          method: 'DELETE',
          headers: token ? { 'x-delete-token': token } : undefined,
        })
        if (!response.ok) {
          window.alert(t('comments.error.deleteFailed'))
          return
        }
        clearDeleteToken(commentId)
        await load()
      } catch {
        window.alert(t('comments.error.deleteFailed'))
      } finally {
        setDeletingId(null)
      }
    },
    [load, t]
  )

  const hasLocalDeleteToken = useCallback(
    (commentId: string) => localTokenIds.has(commentId),
    [localTokenIds]
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
                hasLocalDeleteToken={hasLocalDeleteToken}
                onReply={setReplyTo}
                onDelete={handleDelete}
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
