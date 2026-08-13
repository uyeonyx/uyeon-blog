'use client'

// 댓글 본문 수정 폼.
// 원문은 목록 응답에 실려 있지 않고 여기서 따로 받아온다 — 모든 방문자에게 마크다운 원문까지
// 내려보낼 이유가 없다. 권한이 없으면 그 조회 자체가 403이므로 폼도 열리지 않는다.
// 익명 판정은 쿠키로 이뤄지므로 요청에 실어 보낼 자격 증명이 없다.
import { type FormEvent, useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n/i18n-context'

interface CommentEditFormProps {
  commentId: string
  onCancel: () => void
  onSaved: () => void
}

export default function CommentEditForm({ commentId, onCancel, onSaved }: CommentEditFormProps) {
  const { t } = useI18n()

  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadSource() {
      try {
        const response = await fetch(`/api/comments/${commentId}`)
        const data = await response.json().catch(() => null)
        if (cancelled) return

        if (!response.ok || typeof data?.bodyMd !== 'string') {
          setError(t('comments.error.editFailed'))
          return
        }
        setBody(data.bodyMd)
      } catch {
        if (!cancelled) setError(t('comments.error.editFailed'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadSource()
    return () => {
      cancelled = true
    }
  }, [commentId, t])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (saving || loading) return

    setError(null)
    setSaving(true)
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        // 작성 폼과 같은 규칙 — 서버는 코드만 주고 문구는 로케일에 맞춰 고른다
        const code = typeof data?.code === 'string' ? data.code : 'editFailed'
        const message = t(`comments.error.${code}`)
        setError(message.startsWith('comments.error.') ? t('comments.error.editFailed') : message)
        return
      }

      onSaved()
    } catch {
      setError(t('comments.error.editFailed'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">{t('comments.loading')}</p>
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-2">
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        rows={4}
        maxLength={5000}
        required
        // biome-ignore lint/a11y/noAutofocus: 사용자가 수정 버튼을 눌러 연 직후에만 나타난다
        autoFocus
        className="w-full resize-y rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-primary-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
      />

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full px-3 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          {t('comments.cancel')}
        </button>
        <button
          type="submit"
          disabled={saving || body.trim().length === 0}
          className="rounded-full bg-gray-900 px-4 py-1.5 text-sm font-semibold text-white transition-all hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
        >
          {saving ? t('comments.saving') : t('comments.save')}
        </button>
      </div>
    </form>
  )
}
