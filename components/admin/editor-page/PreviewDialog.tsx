'use client'

import { MDXLayoutRenderer } from 'pliny/mdx-components'
import { components } from '@/components/MDXComponents'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export interface PreviewData {
  code: string
  lang: 'ko' | 'en'
}

interface PreviewDialogProps {
  preview: PreviewData | null
  title: string
  summary: string
  onClose: () => void
}

export default function PreviewDialog({ preview, title, summary, onClose }: PreviewDialogProps) {
  return (
    <Dialog open={!!preview} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader className="pb-0">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-400">
            미리보기
            <span className="rounded-full bg-primary-500/10 px-2 py-0.5 text-xs font-semibold text-primary-600 dark:text-primary-400">
              {preview?.lang === 'ko' ? '한국어' : 'English'}
            </span>
          </div>
          <DialogTitle>{title || '(제목 없음)'}</DialogTitle>
          {summary && <p className="text-gray-500 dark:text-gray-400">{summary}</p>}
        </DialogHeader>
        <div className="prose dark:prose-invert max-w-none px-6 pt-4 pb-10">
          {preview && <MDXLayoutRenderer code={preview.code} components={components} />}
        </div>
      </DialogContent>
    </Dialog>
  )
}
