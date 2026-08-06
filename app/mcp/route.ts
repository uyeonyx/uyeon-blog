// 공개 read-only MCP 엔드포인트 — 인증 없음, published 콘텐츠만.
// 방문자가 자신의 Claude에 연결하는 용도: claude.ai 커스텀 커넥터 또는
//   claude mcp add --transport http uyeon-blog https://uyeon.dev/mcp
// 주의: 이 라우트는 401을 반환하지 않는다 — 401을 내면 MCP 클라이언트가
// .well-known OAuth 메타데이터를 탐색해 admin 로그인 플로우로 빠진다.
import { createMcpHandler } from 'mcp-handler'
import { checkRateLimit } from '@/lib/mcp/rate-limit'
import { registerPublicTools } from '@/lib/mcp/tools/public'

export const runtime = 'nodejs'
// 읽기 전용 조회뿐 (admin 라우트와 달리 mdx 컴파일·업로드 없음)
export const maxDuration = 60

// 브라우저 기반 MCP 클라이언트 대응
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, mcp-protocol-version, mcp-session-id',
  'Access-Control-Expose-Headers': 'mcp-session-id',
  'Access-Control-Max-Age': '86400',
}

const mcpHandler = createMcpHandler(
  (server) => {
    registerPublicTools(server)
  },
  {
    serverInfo: { name: 'uyeon-blog-public', version: '1.0.0' },
    instructions: [
      'uyeon.dev 블로그의 공개 read-only 서버. 게시(published)된 글·프로젝트·소개만 조회할 수 있다.',
      '본문은 마크다운으로 반환되고, 콘텐츠는 ko/en 두 언어가 쌍으로 존재한다.',
      '모든 응답에 공개 URL이 포함된다 — 사용자에게 출처를 안내할 때 그 URL을 사용하라.',
    ].join('\n'),
  }
)

async function handler(request: Request) {
  const limit = checkRateLimit(request)
  if (!limit.ok) {
    return Response.json(
      { error: 'rate_limited', message: '요청이 너무 많습니다. 잠시 후 다시 시도하세요.' },
      {
        status: 429,
        headers: { 'Retry-After': String(limit.retryAfterSeconds), ...CORS_HEADERS },
      }
    )
  }
  const response = await mcpHandler(request)
  // SSE 스트림을 보존하면서 CORS 헤더 병합
  const headers = new Headers(response.headers)
  for (const [key, value] of Object.entries(CORS_HEADERS)) headers.set(key, value)
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

export { handler as GET, handler as POST, handler as DELETE, OPTIONS }
