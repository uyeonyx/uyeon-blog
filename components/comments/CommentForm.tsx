'use client'

import { type FormEvent, useState } from 'react'
import { useI18n } from '@/lib/i18n/i18n-context'
import type { CommentsResponse } from './types'
import { useChallenge } from './useChallenge'

interface CommentFormProps {
  slug: string
  parentId?: string | null
  viewer: CommentsResponse['viewer']
  anonymousAllowed: boolean
  /** 로그인 후 돌아올 경로 — 레이아웃에서 usePathname으로 역산하지 않고 페이지가 아는 값을 쓴다 */
  returnPath: string
  onPosted: () => void
  /** 로그아웃 후 목록·뷰어 상태를 다시 읽어오게 한다 */
  onSignedOut: () => void
  onCancel?: () => void
  autoFocus?: boolean
}

export default function CommentForm({
  slug,
  parentId = null,
  viewer,
  anonymousAllowed,
  returnPath,
  onPosted,
  onSignedOut,
  onCancel,
  autoFocus = false,
}: CommentFormProps) {
  const { t, locale } = useI18n()
  const { state: challengeState, consume, retry } = useChallenge()

  const [body, setBody] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [website, setWebsite] = useState('') // 허니팟 — 사람에게는 보이지 않는다
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loginUrl = `/api/auth/github/login?intent=comment&next=${encodeURIComponent(returnPath)}`

  if (!viewer && !anonymousAllowed) {
    return (
      <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 text-sm dark:border-gray-800 dark:bg-gray-900/40">
        <p className="mb-3 text-gray-600 dark:text-gray-400">{t('comments.loginOnly')}</p>
        <a
          href={loginUrl}
          className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
        >
          {t('comments.signIn')}
        </a>
      </div>
    )
  }

  async function handleSignOut() {
    await fetch(`/api/auth/user/logout?next=${encodeURIComponent(returnPath)}`, {
      method: 'POST',
      redirect: 'manual',
    }).catch(() => {})
    onSignedOut()
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return

    setError(null)
    const challenge = consume()
    if (!challenge) {
      // 아직 계산 중이거나 실패한 상태 — 다시 준비시키고 사용자에게 알린다
      retry()
      setError(t('comments.error.verification_failed'))
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          parentId,
          body,
          locale,
          authorName: viewer ? undefined : authorName,
          website,
          challenge,
        }),
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        const code = typeof data?.code === 'string' ? data.code : 'generic'
        const message = t(`comments.error.${code}`)
        // translate()는 미스 시 키를 그대로 돌려주므로 그때는 일반 문구로 떨어뜨린다
        setError(message.startsWith('comments.error.') ? t('comments.error.generic') : message)
        return
      }

      setBody('')
      setAuthorName('')
      onPosted()
    } catch {
      setError(t('comments.error.generic'))
    } finally {
      setSubmitting(false)
    }
  }

  const busy = submitting || challengeState === 'working'

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {viewer ? (
        <div className="flex items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span>{t('comments.signedInAs', { name: viewer.name })}</span>
          {/* form 안에 form을 중첩할 수 없어 fetch로 처리한다 */}
          <button
            type="button"
            onClick={handleSignOut}
            className="hover:text-primary-500 dark:hover:text-primary-400"
          >
            {t('comments.signOut')}
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <input
            type="text"
            value={authorName}
            onChange={(event) => setAuthorName(event.target.value)}
            placeholder={t('comments.namePlaceholder')}
            maxLength={20}
            required
            className="w-40 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 outline-none transition-colors focus:border-primary-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          <a
            href={loginUrl}
            className="text-xs font-medium text-gray-500 underline-offset-2 hover:text-primary-500 hover:underline dark:text-gray-400 dark:hover:text-primary-400"
          >
            {t('comments.signIn')}
          </a>
        </div>
      )}

      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder={parentId ? t('comments.replyPlaceholder') : t('comments.placeholder')}
        rows={parentId ? 3 : 4}
        maxLength={5000}
        required
        // biome-ignore lint/a11y/noAutofocus: 답글 폼은 사용자가 답글 버튼을 눌러 연 직후에만 나타난다
        autoFocus={autoFocus}
        className="w-full resize-y rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-primary-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
      />

      {/* 봇만 채우는 필드 — 스크린리더에서도 숨긴다 */}
      <input
        type="text"
        name="website"
        value={website}
        onChange={(event) => setWebsite(event.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="pointer-events-none absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {viewer ? t('comments.markdownHint') : t('comments.anonymousHint')}
        </p>
        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full px-3 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              {t('comments.cancel')}
            </button>
          )}
          <button
            type="submit"
            disabled={busy || body.trim().length === 0}
            className="rounded-full bg-gray-900 px-4 py-1.5 text-sm font-semibold text-white transition-all hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-300"
          >
            {submitting
              ? t('comments.submitting')
              : challengeState === 'working'
                ? t('comments.preparing')
                : t('comments.submit')}
          </button>
        </div>
      </div>
    </form>
  )
}
