// AI 에이전트용 MCP 엔드포인트 — Streamable HTTP, Bearer 정적 토큰 인증.
// 접속: claude mcp add --transport http blog https://uyeon.dev/api/mcp \
//        --header "Authorization: Bearer $MCP_AUTH_TOKEN"
import { createMcpHandler, withMcpAuth } from 'mcp-handler'
import { verifyMcpToken } from '@/lib/mcp/auth'
import { captureRequestContext } from '@/lib/mcp/request-context'
import { registerContentTools } from '@/lib/mcp/tools/content'
import { registerPostTools } from '@/lib/mcp/tools/posts'

export const runtime = 'nodejs'
// mdx-bundler 컴파일(언어당 수 초) × 2 + Blob 업로드 여유
export const maxDuration = 300

const mcpHandler = createMcpHandler(
  (server) => {
    registerPostTools(server)
    registerContentTools(server)
  },
  {
    serverInfo: { name: 'uyeon-blog', version: '1.0.0' },
    instructions: [
      'uyeon.dev 블로그 관리 서버. 글(posts)·프로젝트(projects)·소개(about)를 조회/수정할 수 있다.',
      '글과 프로젝트 본문은 마크다운으로 읽고 쓴다. ko/en 두 언어가 항상 쌍으로 존재한다.',
      '수정 후 공개 페이지 캐시는 자동 무효화된다 (별도 배포 불필요).',
    ].join('\n'),
  }
)

const authed = withMcpAuth(mcpHandler, verifyMcpToken, { required: true })

// 도구 콜백에서 revalidateTag가 동작하도록 요청 컨텍스트를 캡처한 뒤 위임
function handler(request: Request) {
  captureRequestContext(request)
  return authed(request)
}

export { handler as GET, handler as POST, handler as DELETE }
