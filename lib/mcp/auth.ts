import { createHash, timingSafeEqual } from 'node:crypto'

export interface McpAuthInfo {
  token: string
  clientId: string
  scopes: string[]
}

/**
 * 정적 Bearer 토큰 검증 — env MCP_AUTH_TOKEN과 상수 시간 비교.
 * 통과 시 AuthInfo, 실패 시 undefined (withMcpAuth가 401 처리).
 */
export function verifyMcpToken(_req: Request, bearerToken?: string): McpAuthInfo | undefined {
  const expected = process.env.MCP_AUTH_TOKEN
  if (!expected || !bearerToken) return undefined

  const a = createHash('sha256').update(bearerToken).digest()
  const b = createHash('sha256').update(expected).digest()
  if (!timingSafeEqual(a, b)) return undefined

  return { token: bearerToken, clientId: 'blog-admin', scopes: ['admin'] }
}
