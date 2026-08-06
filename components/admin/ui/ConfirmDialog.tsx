'use client'

import { Icon } from '@iconify/react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AdminButton } from './primitives'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  busy?: boolean
  onConfirm: () => void
}

export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = '확인',
  cancelLabel = '취소',
  danger = false,
  busy = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <AdminButton onClick={() => onOpenChange(false)} disabled={busy}>
            {cancelLabel}
          </AdminButton>
          <AdminButton
            variant={danger ? 'danger' : 'primary'}
            onClick={onConfirm}
            disabled={busy}
            className="justify-center"
          >
            {busy && <Icon icon="solar:refresh-bold" className="size-4 animate-spin" />}
            {confirmLabel}
          </AdminButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
