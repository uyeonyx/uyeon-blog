// OAuth Protected Resource Metadata (RFC 9728) — MCP 클라이언트가 401의
// WWW-Authenticate resource_metadata를 따라와 인증 서버를 발견하는 진입점
import { getPublicOrigin } from 'mcp-handler'
import { corsJson, corsPreflight } from '@/lib/mcp/oauth-cors'

export function GET(request: Request) {
  const origin = getPublicOrigin(request)
  return corsJson({
    resource: `${origin}/api/mcp`,
    authorization_servers: [origin],
    bearer_methods_supported: ['header'],
    scopes_supported: ['admin'],
  })
}

export function OPTIONS() {
  return corsPreflight()
}
