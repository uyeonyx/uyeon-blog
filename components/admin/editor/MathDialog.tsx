'use client'

import katex from 'katex'
import { useEffect, useMemo, useState } from 'react'
import { AdminButton, AdminTextarea } from '@/components/admin/ui/primitives'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export interface MathDialogState {
  mode: 'insert' | 'edit'
  type: 'inline' | 'block'
  latex: string
  /** edit 모드에서 대상 노드 위치 */
  pos?: number
}

interface MathDialogProps {
  state: MathDialogState | null
  onSubmit: (latex: string, state: MathDialogState) => void
  onClose: () => void
}

export default function MathDialog({ state, onSubmit, onClose }: MathDialogProps) {
  const [latex, setLatex] = useState('')

  useEffect(() => {
    if (state) setLatex(state.latex)
  }, [state])

  const rendered = useMemo(() => {
    if (!latex.trim()) return null
    try {
      return katex.renderToString(latex, {
        throwOnError: false,
        displayMode: state?.type === 'block',
      })
    } catch (e) {
      return null
    }
  }, [latex, state?.type])

  const submit = () => {
    if (state && latex.trim()) onSubmit(latex.trim(), state)
  }

  return (
    <Dialog open={!!state} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl">
            {state?.mode === 'edit' ? '수식 수정' : '수식 삽입'}
          </DialogTitle>
          <DialogDescription>
            LaTeX 문법으로 입력하세요 ({state?.type === 'block' ? '블록' : '인라인'} 수식)
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-6">
          <AdminTextarea
            value={latex}
            onChange={(e) => setLatex(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault()
                submit()
              }
            }}
            rows={3}
            placeholder="E = mc^2"
            className="font-mono"
            // biome-ignore lint/a11y/noAutofocus: 다이얼로그 입력 필드 포커스는 의도된 동작
            autoFocus
          />
          <div className="min-h-16 overflow-x-auto rounded-lg bg-gray-100/60 p-4 dark:bg-gray-800/60">
            {rendered ? (
              // biome-ignore lint/security/noDangerouslySetInnerHtml: katex 출력 렌더링
              <div dangerouslySetInnerHTML={{ __html: rendered }} />
            ) : (
              <p className="text-sm text-gray-400">미리보기가 여기에 표시됩니다</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <AdminButton onClick={onClose}>취소</AdminButton>
          <AdminButton variant="primary" onClick={submit} disabled={!latex.trim()}>
            {state?.mode === 'edit' ? '수정' : '삽입'} <span className="opacity-60">⌘⏎</span>
          </AdminButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
