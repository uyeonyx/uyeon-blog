'use client'

import { useI18n } from '@/lib/i18n/i18n-context'
import { formatDate } from '@/lib/i18n/utils'
import AnonAvatar from './AnonAvatar'
import CommentEditForm from './CommentEditForm'
import type { PublicComment } from './types'

interface CommentItemProps {
  comment: PublicComment
  onReply: (commentId: string) => void
  onDelete: (commentId: string) => void
  onEdit: (commentId: string) => void
  onCancelEdit: () => void
  onSavedEdit: () => void
  editingId: string | null
  deletingId: string | null
  /** 답글에는 답글 버튼을 달지 않는다 — 스레드는 1단까지만 */
  isReply?: boolean
}

function Avatar({ comment }: { comment: PublicComment }) {
  if (comment.authorAvatarUrl) {
    return (
      // 외부 아바타는 next/image 최적화 대상이 아니고 CSP img-src가 이미 열려 있다
      // biome-ignore lint/performance/noImgElement: 24px 외부 아바타에 next/image는 과하다
      <img
        src={comment.authorAvatarUrl}
        alt=""
        width={32}
        height={32}
        loading="lazy"
        className="h-8 w-8 shrink-0 rounded-full bg-gray-100 dark:bg-gray-800"
      />
    )
  }

  // 익명은 브라우저마다 고정된 무늬를 갖는다 — 같은 스레드에서 같은 사람을 알아볼 수 있게
  if (comment.anonAvatarSeed) {
    return <AnonAvatar seed={comment.anonAvatarSeed} />
  }

  return (
    <div
      aria-hidden="true"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400"
    >
      {comment.authorName.slice(0, 1).toUpperCase() || '?'}
    </div>
  )
}

export default function CommentItem({
  comment,
  onReply,
  onDelete,
  onEdit,
  onCancelEdit,
  onSavedEdit,
  editingId,
  deletingId,
  isReply = false,
}: CommentItemProps) {
  const { t, locale } = useI18n()

  const replies = comment.replies ?? []
  const renderReplies = () =>
    replies.length > 0 && (
      <ul className="mt-2 space-y-1 border-l border-gray-100 pl-4 dark:border-gray-800 sm:pl-6">
        {replies.map((reply) => (
          <CommentItem
            key={reply.id}
            comment={reply}
            onReply={onReply}
            onDelete={onDelete}
            onEdit={onEdit}
            onCancelEdit={onCancelEdit}
            onSavedEdit={onSavedEdit}
            editingId={editingId}
            deletingId={deletingId}
            isReply
          />
        ))}
      </ul>
    )

  if (comment.isDeleted) {
    return (
      <li id={`comment-${comment.id}`} className="py-4">
        <p className="text-sm italic text-gray-400 dark:text-gray-500">{t('comments.deleted')}</p>
        {renderReplies()}
      </li>
    )
  }

  // 익명 포함 모든 권한을 서버가 쿠키·세션으로 판정해 내려준다 (API가 다시 검사한다)
  const { canEdit, canDelete } = comment
  const isEditing = editingId === comment.id
  const isDeleting = deletingId === comment.id

  return (
    <li id={`comment-${comment.id}`} className="py-4">
      <div className="flex gap-3">
        <Avatar comment={comment} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {comment.authorUrl ? (
              <a
                href={comment.authorUrl}
                target="_blank"
                rel="nofollow ugc noopener noreferrer"
                className="text-sm font-semibold text-gray-900 hover:text-primary-500 dark:text-gray-100 dark:hover:text-primary-400"
              >
                {comment.authorName}
              </a>
            ) : (
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {comment.authorName}
              </span>
            )}

            {comment.isOwner && (
              <span className="rounded-full bg-primary-500/10 px-2 py-0.5 text-xs font-medium text-primary-600 dark:text-primary-400">
                {t('comments.ownerBadge')}
              </span>
            )}
            {comment.authorType === 'anonymous' && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                {t('comments.anonymousBadge')}
              </span>
            )}

            <time dateTime={comment.createdAt} className="text-xs text-gray-400 dark:text-gray-500">
              {formatDate(comment.createdAt, locale)}
            </time>
            {comment.editedAt && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {t('comments.edited')}
              </span>
            )}
          </div>

          {isEditing ? (
            <CommentEditForm commentId={comment.id} onCancel={onCancelEdit} onSaved={onSavedEdit} />
          ) : (
            <>
              {/* 서버가 저장 시점에 sanitize한 HTML — 허용 태그 화이트리스트를 통과한 결과다 */}
              <div
                className="prose prose-sm mt-2 max-w-none break-words text-gray-700 dark:prose-invert dark:text-gray-300"
                // biome-ignore lint/security/noDangerouslySetInnerHtml: lib/comments/markdown.ts에서 rehype-sanitize를 거친 값만 저장된다
                dangerouslySetInnerHTML={{ __html: comment.bodyHtml }}
              />

              <div className="mt-2 flex items-center gap-3">
                {!isReply && (
                  <button
                    type="button"
                    onClick={() => onReply(comment.id)}
                    className="text-xs font-medium text-gray-500 transition-colors hover:text-primary-500 dark:text-gray-400 dark:hover:text-primary-400"
                  >
                    {t('comments.reply')}
                  </button>
                )}
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(comment.id)}
                    className="text-xs font-medium text-gray-400 transition-colors hover:text-primary-500 dark:text-gray-500 dark:hover:text-primary-400"
                  >
                    {t('comments.edit')}
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(comment.id)}
                    disabled={isDeleting}
                    className="text-xs font-medium text-gray-400 transition-colors hover:text-red-500 disabled:opacity-50 dark:text-gray-500"
                  >
                    {t('comments.delete')}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {renderReplies()}
    </li>
  )
}
