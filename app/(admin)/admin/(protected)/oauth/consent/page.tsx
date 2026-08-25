// MCP OAuth 동의 화면 — /api/oauth/authorize GET이 검증을 마친 뒤 여기로 보낸다.
// (protected) 레이아웃 안이므로 requireAdmin + proxy 게이트를 이미 통과한 상태.
// 코드 발급은 ConsentForm의 POST에서만 일어난다 (단일사용 동의 토큰).
// POST가 실패하면 JSON을 뱉는 대신 ?error=로 여기로 되돌아온다 — 막다른 길을 만들지 않는다.
import { ConsentForm } from '@/components/admin/ConsentForm'
import { verifyConsentToken } from '@/lib/mcp/oauth'

export const metadata = { title: 'MCP 연결 승인' }

const ERROR_MESSAGE: Record<string, { title: string; body: string }> = {
  used: {
    title: '이미 처리된 승인 요청입니다',
    body: '승인 한 번당 코드 한 개만 발급됩니다. 이 화면을 새로고침하거나 뒤로 가서 다시 누를 수는 없고, 연결을 처음부터 다시 시작해야 합니다.',
  },
  expired: {
    title: '승인 요청이 만료되었거나 잘못되었습니다',
    body: '동의 화면은 5분간 유효합니다. 연결을 다시 시도해 주세요.',
  },
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">{title}</h1>
      <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">{body}</p>
      <p className="mt-6 text-sm text-gray-500 dark:text-gray-500">
        클라이언트(claude.ai)의 커넥터 설정에서 연결을 다시 시작하면 새 승인 화면이 열립니다.
      </p>
    </div>
  )
}

export default async function OAuthConsentPage(props: {
  searchParams: Promise<{ ct?: string; error?: string }>
}) {
  const { ct, error } = await props.searchParams

  if (error) {
    const message = ERROR_MESSAGE[error] ?? ERROR_MESSAGE.expired
    return <Notice title={message.title} body={message.body} />
  }

  const consent = ct ? await verifyConsentToken(ct) : null
  if (!consent) return <Notice {...ERROR_MESSAGE.expired} />

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
      <ConsentForm ct={ct as string} />
      <p className="mt-4 text-xs text-gray-500 dark:text-gray-500">
        승인 후 자동으로 {redirectHost}(으)로 돌아갑니다 — 버튼은 한 번만 누르세요.
      </p>
    </div>
  )
}
