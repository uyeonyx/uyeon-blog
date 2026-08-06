'use client'

import { Icon } from '@iconify/react'
import { AdminButton, type PostStatus, StatusBadge } from '@/components/admin/ui/primitives'

interface ActionBarProps {
  status: PostStatus
  isDirty: boolean
  saving: boolean
  autoSaveFailed: boolean
  lastSavedAt: Date | null
  previewLoading: boolean
  onPreview: () => void
  onSave: () => void
  onChangeStatus: (next: PostStatus) => void
  onDelete: () => void
}

function SaveState({
  saving,
  isDirty,
  autoSaveFailed,
  lastSavedAt,
}: Pick<ActionBarProps, 'saving' | 'isDirty' | 'autoSaveFailed' | 'lastSavedAt'>) {
  if (saving) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
        <Icon icon="solar:refresh-bold" className="size-3.5 animate-spin text-primary-500" />
        저장 중…
      </span>
    )
  }
  if (autoSaveFailed && isDirty) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-red-500 dark:text-red-400">
        <span className="size-1.5 rounded-full bg-red-500" />
        자동 저장 실패
      </span>
    )
  }
  if (isDirty) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
        <span className="size-1.5 animate-pulse rounded-full bg-amber-500" />
        저장되지 않은 변경
      </span>
    )
  }
  if (lastSavedAt) {
    return (
      <span className="text-xs text-gray-400 dark:text-gray-500">
        {lastSavedAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}에 저장됨
      </span>
    )
  }
  return null
}

export default function ActionBar(props: ActionBarProps) {
  const { status, isDirty, saving, previewLoading, onPreview, onSave, onChangeStatus, onDelete } =
    props

  return (
    <div className="sticky top-4 z-40">
      <div className="relative rounded-2xl border border-white/60 bg-white/70 shadow-2xl shadow-gray-900/20 backdrop-blur-3xl before:absolute before:inset-0 before:rounded-2xl before:bg-linear-to-b before:from-white/40 before:to-transparent before:pointer-events-none dark:border-gray-600/80 dark:bg-gray-800/70 dark:shadow-primary-500/20 dark:before:from-white/10">
        <div className="relative flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
          <div className="flex items-center gap-3">
            <StatusBadge status={status} />
            <SaveState {...props} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AdminButton onClick={onPreview} disabled={previewLoading} className="px-3">
              {previewLoading ? (
                <Icon icon="solar:refresh-bold" className="size-4 animate-spin" />
              ) : (
                <Icon icon="solar:eye-bold" className="size-4" />
              )}
              <span className="hidden sm:inline">미리보기</span>
            </AdminButton>
            <AdminButton onClick={onSave} disabled={!isDirty || saving} className="px-3">
              <Icon icon="solar:diskette-bold" className="size-4" />
              <span className="hidden sm:inline">저장</span>
            </AdminButton>
            {status !== 'published' && (
              <AdminButton variant="primary" onClick={() => onChangeStatus('published')}>
                <Icon icon="solar:plain-bold" className="size-4" />
                게시
              </AdminButton>
            )}
            {status === 'published' && (
              <AdminButton onClick={() => onChangeStatus('draft')} className="px-3">
                <Icon icon="solar:undo-left-bold" className="size-4" />
                <span className="hidden sm:inline">초안으로</span>
              </AdminButton>
            )}
            {status !== 'archived' ? (
              <AdminButton onClick={() => onChangeStatus('archived')} className="px-3">
                <Icon icon="solar:archive-bold" className="size-4" />
                <span className="hidden md:inline">아카이브</span>
              </AdminButton>
            ) : (
              <AdminButton onClick={() => onChangeStatus('draft')} className="px-3">
                <Icon icon="solar:archive-up-bold" className="size-4" />
                <span className="hidden md:inline">아카이브 해제</span>
              </AdminButton>
            )}
            <AdminButton variant="danger" onClick={onDelete} className="px-3">
              <Icon icon="solar:trash-bin-trash-bold" className="size-4" />
              <span className="hidden md:inline">삭제</span>
            </AdminButton>
          </div>
        </div>
      </div>
    </div>
  )
}
