// OAuth 인가 엔드포인트 — 승인 = 기존 GitHub 관리자 로그인.
// 관리자 세션이 있으면 즉시 code 발급 (redirect_uri가 화이트리스트 검증을 통과한
// 등록 클라이언트이므로 별도 동의 화면 없이 자동 승인), 없으면 GitHub 로그인 후 복귀.
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin/session'
import { isAllowedRedirectUri, signAuthCode, verifyClientId } from '@/lib/mcp/oauth'

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

  const code = await signAuthCode({ clientId, redirectUri, codeChallenge })
  const target = new URL(redirectUri)
  target.searchParams.set('code', code)
  if (state) target.searchParams.set('state', state)
  return NextResponse.redirect(target)
}
