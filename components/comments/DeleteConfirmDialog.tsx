'use client'

// 댓글 삭제 확인 — window.confirm/alert을 대신한다.
//
// 공개 사이트에서 이미 쓰는 Radix 다이얼로그(components/ui/dialog)를 그대로 쓴다. 포커스 트랩과
// ESC 닫기, 스크롤 잠금이 딸려 오고 번들도 늘지 않는다 (ProjectCard가 같은 것을 쓴다).
//
// 실패도 여기서 보여준다. 브라우저 alert으로 띄우면 다이얼로그가 이미 닫힌 뒤라 무엇을 다시
// 눌러야 하는지 알 수 없다 — 열어 둔 채 사유를 붙이면 그 자리에서 재시도할 수 있다.
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useI18n } from '@/lib/i18n/i18n-context'

interface DeleteConfirmDialogProps {
  open: boolean
  busy: boolean
  error: string | null
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export default function DeleteConfirmDialog({
  open,
  busy,
  error,
  onOpenChange,
  onConfirm,
}: DeleteConfirmDialogProps) {
  const { t } = useI18n()

  return (
    <Dialog
      open={open}
      // 삭제하는 중에는 바깥 클릭이나 ESC로 닫히지 않게 한다
      onOpenChange={(next) => {
        if (!busy) onOpenChange(next)
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl">{t('comments.deleteTitle')}</DialogTitle>
          <DialogDescription className="text-sm">
            {t('comments.deleteDescription')}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p className="px-6 text-sm text-red-500" role="alert">
            {error}
          </p>
        )}

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={busy}
            className="rounded-full px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900 disabled:opacity-50 dark:text-gray-400 dark:hover:text-gray-100"
          >
            {t('comments.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            // 포커스 링은 css/tailwind.css의 전역 button:focus-visible 규칙이 그린다
            className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? t('comments.deleting') : t('comments.delete')}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
