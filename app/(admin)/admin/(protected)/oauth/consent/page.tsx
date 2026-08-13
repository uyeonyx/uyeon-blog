// MCP OAuth 동의 화면 — /api/oauth/authorize GET이 검증을 마친 뒤 여기로 보낸다.
// (protected) 레이아웃 안이므로 requireAdmin + proxy 게이트를 이미 통과한 상태.
// 코드 발급은 아래 form POST에서만 일어난다 (단일사용 동의 토큰).
import { verifyConsentToken } from '@/lib/mcp/oauth'

export const metadata = { title: 'MCP 연결 승인' }

export default async function OAuthConsentPage(props: { searchParams: Promise<{ ct?: string }> }) {
  const { ct } = await props.searchParams
  const consent = ct ? await verifyConsentToken(ct) : null

  if (!consent) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">
          승인 요청이 만료되었거나 잘못되었습니다
        </h1>
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          연결을 다시 시도해 주세요 (동의 화면은 5분간 유효합니다).
        </p>
      </div>
    )
  }

  const redirectHost = new URL(consent.redirectUri).host

  return (
    <div className="mx-auto max-w-md py-16">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">MCP 연결 승인</h1>
      <p className="mt-4 text-gray-700 dark:text-gray-300">
        아래 클라이언트가 이 블로그의 <strong>관리자 권한 MCP API</strong>(글·프로젝트·소개
        읽기/쓰기, 이미지 업로드)에 접근하려고 합니다.
      </p>
      <dl className="mt-6 space-y-2 rounded-xl border border-gray-200 p-4 text-sm dark:border-gray-700">
        <div className="flex justify-between gap-4">
          <dt className="text-gray-500 dark:text-gray-400">리다이렉트 대상</dt>
          <dd className="font-mono font-medium text-gray-900 dark:text-gray-50">{redirectHost}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-gray-500 dark:text-gray-400">권한</dt>
          <dd className="font-medium text-gray-900 dark:text-gray-50">admin (전체 콘텐츠 관리)</dd>
        </div>
      </dl>
      <form method="post" action="/api/oauth/authorize" className="mt-8 flex gap-3">
        <input type="hidden" name="ct" value={ct} />
        <button
          type="submit"
          name="decision"
          value="approve"
          className="bg-primary-500 hover:bg-primary-600 flex-1 rounded-lg px-5 py-2.5 font-semibold text-white transition-colors"
        >
          승인
        </button>
        <button
          type="submit"
          name="decision"
          value="deny"
          className="flex-1 rounded-lg border border-gray-300 px-5 py-2.5 font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          거부
        </button>
      </form>
    </div>
  )
}
