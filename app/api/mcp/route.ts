// AI 에이전트용 MCP 엔드포인트 — Streamable HTTP, Bearer 정적 토큰 인증.
// 접속: claude mcp add --transport http blog https://uyeon.dev/api/mcp \
//        --header "Authorization: Bearer $MCP_AUTH_TOKEN"
import { createMcpHandler, withMcpAuth } from 'mcp-handler'
import { verifyMcpToken } from '@/lib/mcp/auth'
import { rejectSubscriptions } from '@/lib/mcp/no-subscriptions'
import { captureRequestContext } from '@/lib/mcp/request-context'
import { registerContentTools } from '@/lib/mcp/tools/content'
import { registerPostTools } from '@/lib/mcp/tools/posts'
import { registerTagTools } from '@/lib/mcp/tools/tags'

export const runtime = 'nodejs'
// mdx-bundler 컴파일(언어당 수 초) × 2 + Blob 업로드 여유
export const maxDuration = 300

const mcpHandler = createMcpHandler(
  (server) => {
    registerPostTools(server)
    registerContentTools(server)
    registerTagTools(server)
  },
  {
    serverInfo: { name: 'uyeon-blog', version: '1.0.0' },
    // 공개 라우트와 같은 이유로 구독 광고를 끈다 — lib/mcp/no-subscriptions.ts 참고.
    // 여기는 maxDuration이 300이라 스트림 하나가 공개 라우트의 20배를 태운다.
    capabilities: { tools: { listChanged: false } },
    instructions: [
      'uyeon.dev 블로그 관리 서버. 글(posts)·프로젝트(projects)·소개(about)를 조회/수정할 수 있다.',
      '글과 프로젝트 본문은 마크다운으로 읽고 쓴다. ko/en 두 언어가 항상 쌍으로 존재한다.',
      '태그를 달 때는 tags_list로 기존 태그를 확인해 재사용할 것 (태그는 canonical slug로 저장된다).',
      '수정 후 공개 페이지 캐시는 자동 무효화된다 (별도 배포 불필요).',
    ].join('\n'),
  }
)

const authed = withMcpAuth(mcpHandler, verifyMcpToken, { required: true })

// 도구 콜백에서 revalidateTag가 동작하도록 요청 컨텍스트를 캡처한 뒤 위임.
// 구독 거부는 인증보다 먼저 본다 — 토큰이 유효하든 아니든 열어줄 스트림이 없다.
async function handler(request: Request) {
  const listenRejection = await rejectSubscriptions(request)
  if (listenRejection) return listenRejection

  captureRequestContext(request)
  return authed(request)
}

export { handler as GET, handler as POST, handler as DELETE }
