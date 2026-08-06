// OAuth 2.0 Authorization Server Metadata (RFC 8414) — claude.ai 커넥터의 자동 탐색용
import { getPublicOrigin } from 'mcp-handler'
import { corsJson, corsPreflight } from '@/lib/mcp/oauth-cors'

export function GET(request: Request) {
  const origin = getPublicOrigin(request)
  return corsJson({
    issuer: origin,
    authorization_endpoint: `${origin}/api/oauth/authorize`,
    token_endpoint: `${origin}/api/oauth/token`,
    registration_endpoint: `${origin}/api/oauth/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    scopes_supported: ['admin'],
  })
}

export function OPTIONS() {
  return corsPreflight()
}
