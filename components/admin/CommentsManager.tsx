'use client'

import { Icon } from '@iconify/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import ConfirmDialog from './ui/ConfirmDialog'
import { AdminButton, GlassCard } from './ui/primitives'
import { useAdminToast } from './ui/toast'

export interface AdminCommentItem {
  id: string
  postSlug: string
  postTitle: string
  authorName: string
  authorType: 'user' | 'anonymous'
  provider: string | null
  bodyMd: string
  status: 'visible' | 'pending' | 'hidden' | 'deleted'
  isOwner: boolean
  locale: string | null
  createdAt: string
  /** 등록 후 본문이 바뀐 시각 — 모더레이션에서는 "언제 쓰였나"만큼 "고쳐졌나"가 중요하다 */
  editedAt: string | null
}

const STATUS_LABEL: Record<AdminCommentItem['status'], string> = {
  visible: '공개',
  pending: '대기',
  hidden: '숨김',
  deleted: '삭제됨',
}

const STATUS_STYLE: Record<AdminCommentItem['status'], string> = {
  visible: 'bg-green-500/10 text-green-600 dark:text-green-400',
  pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  hidden: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
  deleted: 'bg-red-500/10 text-red-600 dark:text-red-400',
}

function CommentRow({ comment, onChanged }: { comment: AdminCommentItem; onChanged: () => void }) {
  const { toast } = useAdminToast()
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const call = async (init: RequestInit, successMessage: string) => {
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/comments/${comment.id}`, init)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast('error', data.error || '요청에 실패했습니다')
        return
      }
      toast('success', successMessage)
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  const toggleHidden = () =>
    call(
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: comment.status === 'hidden' ? 'visible' : 'hidden' }),
      },
      comment.status === 'hidden' ? '댓글을 다시 공개했습니다' : '댓글을 숨겼습니다'
    )

  const remove = () => call({ method: 'DELETE' }, '댓글을 삭제했습니다')

  const isDeleted = comment.status === 'deleted'

  return (
    <div className="border-b border-gray-200/60 py-4 last:border-b-0 dark:border-gray-700/60">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {isDeleted ? '(삭제됨)' : comment.authorName}
        </span>
        {comment.isOwner && (
          <span className="rounded-full bg-primary-500/10 px-2 py-0.5 text-xs font-medium text-primary-600 dark:text-primary-400">
            작성자
          </span>
        )}
        {comment.authorType === 'anonymous' && !isDeleted && (
          <span className="rounded-full bg-gray-500/10 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400">
            익명
          </span>
        )}
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[comment.status]}`}
        >
          {STATUS_LABEL[comment.status]}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {new Date(comment.createdAt).toLocaleString('ko-KR')}
        </span>
        {/* 등록 알림은 원문만 전하므로, 그 뒤에 바뀐 사실은 여기서만 드러난다 */}
        {comment.editedAt && !isDeleted && (
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
            수정됨 · {new Date(comment.editedAt).toLocaleString('ko-KR')}
          </span>
        )}
      </div>

      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        <a
          href={`/ko/blog/${comment.postSlug}#comment-${comment.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-primary-500 dark:hover:text-primary-400"
        >
          {comment.postTitle}
        </a>
      </p>

      {!isDeleted && (
        <p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-700 dark:text-gray-300">
          {comment.bodyMd}
        </p>
      )}

      {!isDeleted && (
        <div className="mt-3 flex items-center gap-2">
          <AdminButton type="button" variant="ghost" onClick={toggleHidden} disabled={busy}>
            <Icon
              icon={comment.status === 'hidden' ? 'solar:eye-bold' : 'solar:eye-closed-bold'}
              className="size-4"
            />
            {comment.status === 'hidden' ? '공개' : '숨김'}
          </AdminButton>
          <AdminButton
            type="button"
            variant="ghost"
            onClick={() => setConfirmDelete(true)}
            disabled={busy}
          >
            <Icon icon="solar:trash-bin-trash-bold" className="size-4" />
            삭제
          </AdminButton>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="댓글을 삭제할까요?"
        description="본문과 작성자 정보가 지워집니다. 답글이 달려 있으면 자리는 남습니다."
        confirmLabel="삭제"
        danger
        busy={busy}
        onConfirm={() => {
          setConfirmDelete(false)
          remove()
        }}
      />
    </div>
  )
}

export default function CommentsManager({ initialItems }: { initialItems: AdminCommentItem[] }) {
  const router = useRouter()

  if (initialItems.length === 0) {
    return (
      <GlassCard className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
        아직 댓글이 없습니다.
      </GlassCard>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
        댓글 관리
      </h1>
      <GlassCard className="px-4 py-2 sm:px-6">
        {initialItems.map((comment) => (
          <CommentRow key={comment.id} comment={comment} onChanged={() => router.refresh()} />
        ))}
      </GlassCard>
    </div>
  )
}
