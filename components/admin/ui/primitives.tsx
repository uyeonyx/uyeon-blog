import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

type ButtonVariant = 'ghost' | 'primary' | 'danger'

const buttonVariants: Record<ButtonVariant, string> = {
  ghost:
    'inline-flex items-center gap-1.5 rounded-full border border-white/60 dark:border-gray-600/80 bg-white/70 dark:bg-gray-800/70 backdrop-blur-3xl px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 shadow-lg shadow-gray-900/5 dark:shadow-primary-500/5 transition-all hover:scale-105 hover:border-primary-500/50 active:scale-95 disabled:pointer-events-none disabled:opacity-50',
  primary:
    'inline-flex items-center gap-1.5 rounded-full bg-primary-500/90 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-primary-500/30 transition-all hover:scale-105 hover:bg-primary-500 active:scale-95 disabled:pointer-events-none disabled:opacity-50',
  danger:
    'inline-flex items-center gap-1.5 rounded-full border border-white/60 dark:border-gray-600/80 bg-white/70 dark:bg-gray-800/70 backdrop-blur-3xl px-4 py-2 text-sm font-semibold text-red-500 dark:text-red-400 shadow-lg shadow-gray-900/5 transition-all hover:scale-105 hover:border-red-500/50 active:scale-95 disabled:pointer-events-none disabled:opacity-50',
}

export function AdminButton({
  variant = 'ghost',
  className,
  type,
  ...props
}: ComponentProps<'button'> & { variant?: ButtonVariant }) {
  return (
    <button type={type ?? 'button'} className={cn(buttonVariants[variant], className)} {...props} />
  )
}

const inputClass =
  'w-full rounded-lg border border-gray-200/80 dark:border-gray-700/80 bg-white/50 dark:bg-gray-900/50 backdrop-blur px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 transition-colors focus:border-primary-500/60 focus:ring-2 focus:ring-primary-500/20 focus:outline-none disabled:opacity-60'

export function AdminInput({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(inputClass, className)} {...props} />
}

export function AdminSelect({ className, ...props }: ComponentProps<'select'>) {
  return <select className={cn(inputClass, className)} {...props} />
}

export function AdminTextarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(inputClass, className)} {...props} />
}

export type PostStatus = 'draft' | 'published' | 'private' | 'archived'

export const STATUS_LABEL: Record<PostStatus, string> = {
  draft: '초안',
  published: '공개',
  private: '비공개',
  archived: '아카이브',
}

const statusBadgeVariants: Record<PostStatus, string> = {
  draft: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  published: 'bg-primary-500/10 text-primary-600 dark:text-primary-400',
  private: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  archived: 'bg-gray-500/10 text-gray-500 dark:text-gray-400',
}

export function StatusBadge({ status, className }: { status: PostStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        statusBadgeVariants[status],
        className
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}

/** 사이트 공용 글래스 카드 (공식 A) — before 하이라이트 때문에 내부 콘텐츠를 relative로 감싼다 */
export function GlassCard({
  className,
  innerClassName,
  hover = false,
  children,
  ...props
}: ComponentProps<'div'> & { innerClassName?: string; hover?: boolean }) {
  return (
    <div
      className={cn(
        'relative rounded-2xl border border-white/60 dark:border-gray-700/80 bg-white/70 dark:bg-gray-900/70 backdrop-blur-3xl shadow-xl shadow-gray-900/10 dark:shadow-primary-500/10 before:absolute before:inset-0 before:rounded-2xl before:bg-linear-to-b before:from-white/40 before:to-transparent before:pointer-events-none dark:before:from-white/5',
        hover &&
          'transition-all duration-300 hover:border-primary-500/40 hover:shadow-2xl hover:shadow-primary-500/20',
        className
      )}
      {...props}
    >
      <div className={cn('relative', innerClassName)}>{children}</div>
    </div>
  )
}
