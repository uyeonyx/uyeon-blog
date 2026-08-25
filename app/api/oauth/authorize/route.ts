// OAuth 인가 엔드포인트 — 승인 = 관리자 로그인 + 명시적 동의.
//
// GET은 요청을 검증만 하고 동의 토큰(5분)을 서명해 /admin/oauth/consent로 보낸다.
// 코드 발급은 동의 화면의 form POST에서만 일어난다 — 로그인된 관리자가 링크를 밟는 것만으로
// (top-level GET 내비게이션은 SameSite=Lax 쿠키가 실린다) 코드가 발급되는 원클릭 탈취 경로를 막는다.
// /api/oauth/register가 무인증(DCR 스펙)이므로 이 동의 단계가 실질 방어선이다.
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin/session'
import { consumeNonce } from '@/lib/db/nonces'
import {
  isAllowedRedirectUri,
  signAuthCode,
  signConsentToken,
  verifyClientId,
  verifyConsentToken,
} from '@/lib/mcp/oauth'

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const clientId = params.get('client_id') ?? ''
  const redirectUri = params.get('redirect_uri') ?? ''
  const state = params.get('state')
  const codeChallenge = params.get('code_challenge') ?? ''
  const codeChallengeMethod = params.get('code_challenge_method') ?? ''
  const responseType = params.get('response_type') ?? ''

  const registeredUris = await verifyClientId(clientId)
  if (!registeredUris) {
    return Response.json({ error: 'invalid_client' }, { status: 400 })
  }
  if (!registeredUris.includes(redirectUri) || !isAllowedRedirectUri(redirectUri)) {
    return Response.json({ error: 'invalid_redirect_uri' }, { status: 400 })
  }

  const fail = (error: string, description: string) => {
    const url = new URL(redirectUri)
    url.searchParams.set('error', error)
    url.searchParams.set('error_description', description)
    if (state) url.searchParams.set('state', state)
    return NextResponse.redirect(url)
  }

  if (responseType !== 'code') return fail('unsupported_response_type', 'code만 지원합니다')
  if (!codeChallenge || codeChallengeMethod !== 'S256') {
    return fail('invalid_request', 'PKCE(S256)가 필요합니다')
  }

  // 관리자 세션 필요 — 없으면 GitHub 로그인 후 이 URL로 복귀
  const session = await getAdminSession()
  if (!session) {
    const login = new URL('/api/auth/github/login', request.nextUrl.origin)
    login.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search)
    return NextResponse.redirect(login)
  }

  // 코드가 아니라 동의 토큰을 발급 — 실제 승인은 동의 화면의 POST에서
  const consentToken = await signConsentToken({ clientId, redirectUri, codeChallenge, state })
  const consent = new URL('/admin/oauth/consent', request.nextUrl.origin)
  consent.searchParams.set('ct', consentToken)
  return NextResponse.redirect(consent)
}

export async function POST(request: NextRequest) {
  // 사람이 보는 폼 제출이므로 실패도 사람이 읽을 화면으로 돌려보낸다 (JSON 막다른 길 금지).
  // 세션 없음은 동의 화면 경로가 proxy 매처에 걸려 자동으로 /admin/login으로 이어진다.
  const back = (error: string) => {
    const url = new URL('/admin/oauth/consent', request.nextUrl.origin)
    url.searchParams.set('error', error)
    return NextResponse.redirect(url, 303)
  }

  // 방어선 1: 관리자 세션 (proxy 매처 밖 경로이므로 직접 검사)
  const session = await getAdminSession()
  if (!session) return back('expired')

  // 방어선 2: 동일 출처 form 제출만 (동의 화면 외의 사이트가 POST를 대신 쏘지 못하게)
  const origin = request.headers.get('origin')
  if (origin) {
    try {
      if (new URL(origin).host !== request.nextUrl.host) {
        return Response.json({ error: 'invalid_origin' }, { status: 403 })
      }
    } catch {
      return Response.json({ error: 'invalid_origin' }, { status: 403 })
    }
  }

  const form = await request.formData().catch(() => null)
  const consentToken = form?.get('ct')
  const decision = form?.get('decision')
  if (typeof consentToken !== 'string' || (decision !== 'approve' && decision !== 'deny')) {
    return Response.json({ error: 'invalid_request' }, { status: 400 })
  }

  const consent = await verifyConsentToken(consentToken)
  if (!consent) return back('expired')

  const target = new URL(consent.redirectUri)
  if (consent.state) target.searchParams.set('state', consent.state)

  if (decision === 'deny') {
    target.searchParams.set('error', 'access_denied')
    return NextResponse.redirect(target, 303)
  }

  // 방어선 3: 동의 토큰 단일사용 — 같은 토큰으로 코드를 두 번 발급받을 수 없다
  // (뒤로가기·이중클릭 재제출이 여기로 온다. 클라이언트로 error 리다이렉트를 보내면
  //  진행 중이던 첫 승인 내비게이션까지 덮어쓰므로, 우리 화면에서 안내만 한다)
  const fresh = await consumeNonce(consent.jti, 'oauth_consent', new Date(consent.expiresAtMs))
  if (!fresh) return back('used')

  const code = await signAuthCode({
    clientId: consent.clientId,
    redirectUri: consent.redirectUri,
    codeChallenge: consent.codeChallenge,
  })
  target.searchParams.set('code', code)
  return NextResponse.redirect(target, 303)
}
