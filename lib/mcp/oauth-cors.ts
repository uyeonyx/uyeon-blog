// OAuth 메타데이터/토큰 엔드포인트용 CORS — 브라우저 기반 MCP 클라이언트 대응
export const OAUTH_CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, mcp-protocol-version',
  'Access-Control-Max-Age': '86400',
}

export function corsPreflight() {
  return new Response(null, { status: 204, headers: OAUTH_CORS_HEADERS })
}

export function corsJson(data: unknown, init?: ResponseInit) {
  return Response.json(data, {
    ...init,
    headers: { ...OAUTH_CORS_HEADERS, ...(init?.headers ?? {}) },
  })
}
