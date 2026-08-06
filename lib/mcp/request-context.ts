// MCP 도구 콜백에서 revalidateTag를 직접 호출하면 유실된다 — SSE 스트리밍 구조상
// 라우트 핸들러의 Response가 도구 실행 전에 반환되어 Next가 pending revalidation을
// 이미 flush한 뒤이기 때문. 대신 자기 자신의 /api/mcp-revalidate로 내부 요청을 보내
// 별도의 정상 요청 컨텍스트에서 무효화한다.
import { getPublicOrigin } from 'mcp-handler'

let origin: string | null = null

/** MCP 라우트 핸들러 진입 직후 호출 — 내부 revalidate 요청에 쓸 origin 캡처 */
export function captureRequestContext(request: Request) {
  origin = getPublicOrigin(request)
}

/** 별도 내부 요청으로 태그 무효화 — 실패해도 도구 결과는 유지 (best-effort) */
export async function mcpRevalidateTag(tag: 'posts' | 'projects' | 'authors' | 'tags') {
  if (!origin) {
    console.error('[mcp] revalidate origin이 캡처되지 않았습니다')
    return
  }
  try {
    const res = await fetch(`${origin}/api/mcp-revalidate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.MCP_AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tags: [tag] }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) console.error(`[mcp] revalidate 실패: HTTP ${res.status}`)
  } catch (e) {
    console.error('[mcp] revalidate 실패:', e)
  }
}
