'use client'

import { Icon } from '@iconify/react'
import { motion } from 'framer-motion'
import { useCallback, useState } from 'react'
import type { TagUsage } from '@/lib/admin/tag-service'
import ConfirmDialog from './ui/ConfirmDialog'
import { AdminButton, AdminInput, GlassCard } from './ui/primitives'
import { useAdminToast } from './ui/toast'

interface RenameState {
  slug: string
  to: string
}

function TagRow({
  tag,
  onSaved,
  onRename,
  onDelete,
}: {
  tag: TagUsage
  onSaved: () => void
  onRename: () => void
  onDelete: () => void
}) {
  const { toast } = useAdminToast()
  const [labelKo, setLabelKo] = useState(tag.labelKo)
  const [labelEn, setLabelEn] = useState(tag.labelEn)
  const [saving, setSaving] = useState(false)
  const dirty = labelKo !== tag.labelKo || labelEn !== tag.labelEn
  const used = tag.postCount + tag.projectCount > 0

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/tags/${encodeURIComponent(tag.slug)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ labelKo, labelEn }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast('error', data.error || '저장에 실패했습니다')
        return
      }
      toast('success', '라벨이 저장되었습니다')
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid grid-cols-1 items-center gap-2 border-b border-gray-200/60 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto] sm:gap-3 dark:border-gray-700/60">
      <div className="min-w-0">
        <p className="truncate font-mono text-sm text-gray-700 dark:text-gray-300">{tag.slug}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          글 {tag.postCount} · 프로젝트 {tag.projectCount}
        </p>
      </div>
      <AdminInput
        value={labelKo}
        onChange={(e) => setLabelKo(e.target.value)}
        placeholder="한글 라벨"
        aria-label={`${tag.slug} 한글 라벨`}
      />
      <AdminInput
        value={labelEn}
        onChange={(e) => setLabelEn(e.target.value)}
        placeholder="영문 라벨"
        aria-label={`${tag.slug} 영문 라벨`}
      />
      <AdminButton onClick={save} disabled={!dirty || saving} className="justify-center">
        <Icon
          icon={saving ? 'solar:refresh-bold' : 'solar:diskette-bold'}
          className={`size-4 ${saving ? 'animate-spin' : ''}`}
        />
        저장
      </AdminButton>
      <div className="flex items-center gap-1.5">
        <AdminButton onClick={onRename} title="slug 변경 또는 다른 태그로 병합">
          <Icon icon="solar:transfer-horizontal-bold" className="size-4" />
          병합/변경
        </AdminButton>
        <AdminButton
          variant="danger"
          onClick={onDelete}
          disabled={used}
          title={used ? '사용 중인 태그는 삭제할 수 없습니다' : '태그 삭제'}
        >
          <Icon icon="solar:trash-bin-trash-bold" className="size-4" />
        </AdminButton>
      </div>
    </div>
  )
}

export default function TagsManager({ initialItems }: { initialItems: TagUsage[] }) {
  const { toast } = useAdminToast()
  const [items, setItems] = useState(initialItems)
  const [rename, setRename] = useState<RenameState | null>(null)
  const [renameBusy, setRenameBusy] = useState(false)
  const [deleteSlug, setDeleteSlug] = useState<string | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const refresh = useCallback(async () => {
    const res = await fetch('/api/admin/tags')
    if (res.ok) {
      const data = await res.json()
      setItems(data.items)
    }
  }, [])

  const registered = items.filter((t) => t.registered)
  const unregistered = items.filter((t) => !t.registered)

  const registerTag = async (slug: string) => {
    const res = await fetch('/api/admin/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, labelKo: slug, labelEn: slug }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast('error', data.error || '등록에 실패했습니다')
      return
    }
    toast('success', `'${slug}' 태그가 등록되었습니다`)
    refresh()
  }

  const submitRename = async () => {
    if (!rename || !rename.to.trim()) return
    setRenameBusy(true)
    try {
      const res = await fetch(`/api/admin/tags/${encodeURIComponent(rename.slug)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ renameTo: rename.to }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast('error', data.error || '변경에 실패했습니다')
        return
      }
      toast(
        'success',
        data.merged
          ? `'${rename.slug}'가 병합되었습니다 (글 ${data.postCount}, 프로젝트 ${data.projectCount} 반영)`
          : `slug가 변경되었습니다 (글 ${data.postCount}, 프로젝트 ${data.projectCount} 반영)`
      )
      setRename(null)
      refresh()
    } finally {
      setRenameBusy(false)
    }
  }

  const submitDelete = async () => {
    if (!deleteSlug) return
    setDeleteBusy(true)
    try {
      const res = await fetch(`/api/admin/tags/${encodeURIComponent(deleteSlug)}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) {
        toast('error', data.error || '삭제에 실패했습니다')
        return
      }
      toast('success', '태그가 삭제되었습니다')
      setDeleteSlug(null)
      refresh()
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      <div className="flex flex-wrap items-end justify-between gap-4 pt-6">
        <h1 className="text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
          <span className="block bg-linear-to-r from-gray-900 via-gray-700 to-gray-900 bg-clip-text text-transparent dark:from-gray-50 dark:via-gray-300 dark:to-gray-50">
            태그 관리
          </span>
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          라벨 수정은 배포 없이 공개 페이지에 바로 반영됩니다
        </p>
      </div>

      <GlassCard innerClassName="px-5 py-2">
        {registered.length === 0 ? (
          <p className="py-8 text-center text-gray-500 dark:text-gray-400">
            등록된 태그가 없습니다.
          </p>
        ) : (
          registered.map((tag) => (
            <TagRow
              key={tag.slug}
              tag={tag}
              onSaved={refresh}
              onRename={() => setRename({ slug: tag.slug, to: '' })}
              onDelete={() => setDeleteSlug(tag.slug)}
            />
          ))
        )}
      </GlassCard>

      {unregistered.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">미등록 태그</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            콘텐츠에는 있지만 태그 마스터에 없는 태그입니다. 등록하면 라벨을 관리할 수 있습니다.
          </p>
          <GlassCard innerClassName="px-5 py-2">
            {unregistered.map((tag) => (
              <div
                key={tag.slug}
                className="flex items-center justify-between gap-3 border-b border-gray-200/60 py-3 last:border-b-0 dark:border-gray-700/60"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm text-gray-700 dark:text-gray-300">
                    {tag.slug}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    글 {tag.postCount} · 프로젝트 {tag.projectCount}
                  </p>
                </div>
                <AdminButton onClick={() => registerTag(tag.slug)}>
                  <Icon icon="solar:add-circle-bold" className="size-4" />
                  등록
                </AdminButton>
              </div>
            ))}
          </GlassCard>
        </div>
      )}

      {/* 병합/slug 변경 다이얼로그 */}
      {rename && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
          <GlassCard className="w-full max-w-md" innerClassName="space-y-4 p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              &lsquo;{rename.slug}&rsquo; 병합/변경
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              새 slug를 입력하세요. 이미 존재하는 태그의 slug를 입력하면 그 태그로 병합되고, 이
              태그를 쓰는 모든 글/프로젝트가 함께 바뀝니다.
            </p>
            <AdminInput
              value={rename.to}
              onChange={(e) => setRename({ ...rename, to: e.target.value })}
              placeholder="new-slug"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitRename()
                if (e.key === 'Escape') setRename(null)
              }}
            />
            <div className="flex justify-end gap-2">
              <AdminButton onClick={() => setRename(null)} disabled={renameBusy}>
                취소
              </AdminButton>
              <AdminButton
                variant="primary"
                onClick={submitRename}
                disabled={renameBusy || !rename.to.trim()}
              >
                {renameBusy && <Icon icon="solar:refresh-bold" className="size-4 animate-spin" />}
                적용
              </AdminButton>
            </div>
          </GlassCard>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteSlug}
        onOpenChange={(open) => {
          if (!open) setDeleteSlug(null)
        }}
        title="태그를 삭제할까요?"
        description={`'${deleteSlug}' 태그가 마스터에서 삭제됩니다. 사용 중인 태그는 삭제할 수 없습니다.`}
        confirmLabel="삭제"
        danger
        busy={deleteBusy}
        onConfirm={submitDelete}
      />
    </motion.div>
  )
}
