import { createHash, timingSafeEqual } from 'node:crypto'
import { verifyAccessToken } from './oauth'

export interface McpAuthInfo {
  token: string
  clientId: string
  scopes: string[]
}

function matchesStaticToken(bearerToken: string): boolean {
  const expected = process.env.MCP_AUTH_TOKEN
  if (!expected) return false
  const a = createHash('sha256').update(bearerToken).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
}

/**
 * Bearer 토큰 검증 — 두 가지를 허용한다:
 * 1. 정적 토큰(env MCP_AUTH_TOKEN, 상수 시간 비교) — Claude Code 등 헤더 지원 클라이언트
 * 2. OAuth 액세스 토큰(JWT) — claude.ai 커스텀 커넥터 (DCR+PKCE 플로우로 발급)
 * 통과 시 AuthInfo, 실패 시 undefined (withMcpAuth가 401 처리).
 */
export async function verifyMcpToken(
  _req: Request,
  bearerToken?: string
): Promise<McpAuthInfo | undefined> {
  if (!bearerToken) return undefined

  if (matchesStaticToken(bearerToken)) {
    return { token: bearerToken, clientId: 'blog-admin', scopes: ['admin'] }
  }
  if (await verifyAccessToken(bearerToken)) {
    return { token: bearerToken, clientId: 'mcp-oauth', scopes: ['admin'] }
  }
  return undefined
}
