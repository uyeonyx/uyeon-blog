// OAuth 동적 클라이언트 등록 (RFC 7591) — 무상태: redirect_uris를 서명한 JWT가 client_id
import type { NextRequest } from 'next/server'
import { isAllowedRedirectUri, signClientId } from '@/lib/mcp/oauth'
import { corsJson, corsPreflight } from '@/lib/mcp/oauth-cors'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const redirectUris: string[] = Array.isArray(body?.redirect_uris)
    ? body.redirect_uris.map(String)
    : []

  if (redirectUris.length === 0) {
    return corsJson(
      { error: 'invalid_client_metadata', error_description: 'redirect_uris가 필요합니다' },
      { status: 400 }
    )
  }
  const disallowed = redirectUris.filter((uri) => !isAllowedRedirectUri(uri))
  if (disallowed.length > 0) {
    return corsJson(
      {
        error: 'invalid_redirect_uri',
        error_description: `허용되지 않는 redirect_uri: ${disallowed.join(', ')}`,
      },
      { status: 400 }
    )
  }

  const clientId = await signClientId(redirectUris)
  return corsJson(
    {
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      redirect_uris: redirectUris,
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      client_name: typeof body?.client_name === 'string' ? body.client_name : undefined,
    },
    { status: 201 }
  )
}

export function OPTIONS() {
  return corsPreflight()
}
