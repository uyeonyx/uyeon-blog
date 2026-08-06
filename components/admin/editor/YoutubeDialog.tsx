'use client'

import { Icon } from '@iconify/react'
import { useEffect, useState } from 'react'
import { AdminButton, AdminInput } from '@/components/admin/ui/primitives'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { extractYoutubeId } from '@/lib/youtube'

interface YoutubeDialogProps {
  open: boolean
  onSubmit: (url: string) => void
  onClose: () => void
}

export default function YoutubeDialog({ open, onSubmit, onClose }: YoutubeDialogProps) {
  const [url, setUrl] = useState('')
  const videoId = extractYoutubeId(url.trim())

  useEffect(() => {
    if (open) setUrl('')
  }, [open])

  const submit = () => {
    if (videoId) onSubmit(url.trim())
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl">유튜브 임베드</DialogTitle>
          <DialogDescription>유튜브 영상 URL을 붙여넣으세요</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 px-6">
          <AdminInput
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                submit()
              }
            }}
            placeholder="https://www.youtube.com/watch?v=..."
            // biome-ignore lint/a11y/noAutofocus: 다이얼로그 입력 필드 포커스는 의도된 동작
            autoFocus
          />
          {url.trim() && !videoId && (
            <p className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400">
              <Icon icon="solar:danger-triangle-bold" className="size-4" />
              유튜브 영상 URL을 인식할 수 없습니다
            </p>
          )}
          {videoId && (
            <p className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
              <Icon icon="solar:check-circle-bold" className="size-4" />
              영상 ID: {videoId}
            </p>
          )}
        </div>
        <DialogFooter>
          <AdminButton onClick={onClose}>취소</AdminButton>
          <AdminButton variant="primary" onClick={submit} disabled={!videoId}>
            삽입
          </AdminButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
