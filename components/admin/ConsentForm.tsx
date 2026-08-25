'use client'
// MCP 동의 화면의 승인/거부 폼.
//
// 이중 제출을 막는 게 핵심이다: 동의 토큰은 단일사용이라 두 번째 제출은 400을 받는데,
// 새 제출이 진행 중이던 첫 내비게이션(claude.ai 콜백으로 가는 303)을 취소시키기 때문에
// 서버는 코드를 발급했는데 브라우저에는 consent_already_used 에러만 남는다.
import { useRef, useState } from 'react'

export function ConsentForm({ ct }: { ct: string }) {
  const submitted = useRef(false)
  const [busy, setBusy] = useState(false)

  return (
    <form
      method="post"
      action="/api/oauth/authorize"
      className="mt-8 flex gap-3"
      onSubmit={(event) => {
        if (submitted.current) {
          event.preventDefault()
          return
        }
        submitted.current = true
        // 비활성화는 다음 틱에 — 제출 시점에 disabled면 눌린 버튼의 decision 값이 폼에서 빠진다
        setTimeout(() => setBusy(true), 0)
      }}
    >
      <input type="hidden" name="ct" value={ct} />
      <button
        type="submit"
        name="decision"
        value="approve"
        disabled={busy}
        className="bg-primary-500 hover:bg-primary-600 flex-1 rounded-lg px-5 py-2.5 font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? '처리 중…' : '승인'}
      </button>
      <button
        type="submit"
        name="decision"
        value="deny"
        disabled={busy}
        className="flex-1 rounded-lg border border-gray-300 px-5 py-2.5 font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
      >
        거부
      </button>
    </form>
  )
}
