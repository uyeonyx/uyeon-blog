// OAuth 토큰 엔드포인트 — authorization_code(PKCE 검증) / refresh_token 교환
import type { NextRequest } from 'next/server'
import {
  ACCESS_TOKEN_MAX_AGE,
  signAccessToken,
  signRefreshToken,
  verifyAuthCode,
  verifyPkce,
  verifyRefreshToken,
} from '@/lib/mcp/oauth'
import { corsJson, corsPreflight } from '@/lib/mcp/oauth-cors'

async function readParams(request: NextRequest): Promise<URLSearchParams> {
  const contentType = request.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    const body = await request.json().catch(() => ({}))
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(body ?? {})) {
      if (typeof v === 'string') params.set(k, v)
    }
    return params
  }
  const text = await request.text().catch(() => '')
  return new URLSearchParams(text)
}

async function issueTokens() {
  return {
    access_token: await signAccessToken(),
    token_type: 'bearer',
    expires_in: ACCESS_TOKEN_MAX_AGE,
    refresh_token: await signRefreshToken(),
    scope: 'admin',
  }
}

export async function POST(request: NextRequest) {
  const params = await readParams(request)
  const grantType = params.get('grant_type')

  if (grantType === 'authorization_code') {
    const code = params.get('code') ?? ''
    const codeVerifier = params.get('code_verifier') ?? ''
    const redirectUri = params.get('redirect_uri') ?? ''

    const payload = await verifyAuthCode(code)
    if (!payload) {
      return corsJson(
        { error: 'invalid_grant', error_description: 'code가 유효하지 않습니다' },
        { status: 400 }
      )
    }
    // redirect_uri는 제공된 경우에만 검증 (OAuth 2.1은 PKCE가 코드 바인딩을 담당)
    if (redirectUri && redirectUri !== payload.redirectUri) {
      return corsJson(
        { error: 'invalid_grant', error_description: 'redirect_uri 불일치' },
        { status: 400 }
      )
    }
    if (!codeVerifier || !verifyPkce(codeVerifier, payload.codeChallenge)) {
      return corsJson(
        { error: 'invalid_grant', error_description: 'PKCE 검증 실패' },
        { status: 400 }
      )
    }
    return corsJson(await issueTokens())
  }

  if (grantType === 'refresh_token') {
    const refreshToken = params.get('refresh_token') ?? ''
    if (!(await verifyRefreshToken(refreshToken))) {
      return corsJson(
        { error: 'invalid_grant', error_description: 'refresh_token이 유효하지 않습니다' },
        { status: 400 }
      )
    }
    return corsJson(await issueTokens())
  }

  return corsJson({ error: 'unsupported_grant_type' }, { status: 400 })
}

export function OPTIONS() {
  return corsPreflight()
}
