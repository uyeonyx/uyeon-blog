// MCP 도구 콜백에서 revalidateTag를 직접 호출하면 유실된다 — SSE 스트리밍 구조상
// 라우트 핸들러의 Response가 도구 실행 전에 반환되어 Next가 pending revalidation을
// 이미 flush한 뒤이기 때문. 대신 자기 자신의 /api/mcp-revalidate로 내부 요청을 보내
// 별도의 정상 요청 컨텍스트에서 무효화한다.
import { getPublicOrigin } from 'mcp-handler'
import siteMetadata from '@/data/siteMetadata'

// 모듈 전역이라 동시 요청이 서로의 origin을 덮어쓸 수 있다 — 단일 도메인 배포에서는 같은 값이므로
// 무해하고, 캡처가 누락된 경우만 canonical siteUrl로 폴백한다.
let origin: string | null = null

/** MCP 라우트 핸들러 진입 직후 호출 — 내부 revalidate 요청에 쓸 origin 캡처 */
export function captureRequestContext(request: Request) {
  origin = getPublicOrigin(request)
}

export interface RevalidateResult {
  ok: boolean
  error?: string
}

/**
 * 별도 내부 요청으로 태그 무효화. 실패해도 던지지 않는다 — DB 쓰기는 이미 끝난 상태이므로
 * 호출자는 결과를 도구 응답의 경고로 실어 에이전트가 재시도할 수 있게 한다.
 */
export async function mcpRevalidateTag(
  tag: 'posts' | 'projects' | 'authors' | 'tags'
): Promise<RevalidateResult> {
  const target = origin ?? siteMetadata.siteUrl
  try {
    const res = await fetch(`${target}/api/mcp-revalidate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.MCP_AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tags: [tag] }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) {
      console.error(`[mcp] revalidate 실패: HTTP ${res.status}`)
      return { ok: false, error: `HTTP ${res.status}` }
    }
    return { ok: true }
  } catch (e) {
    console.error('[mcp] revalidate 실패:', e)
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/** 여러 태그 무효화 결과를 도구 응답용 경고 문자열로 합친다 — 전부 성공이면 null */
export function revalidateWarning(results: RevalidateResult[]): string | null {
  const failed = results.filter((r) => !r.ok)
  if (failed.length === 0) return null
  return `캐시 무효화 실패(${failed.map((f) => f.error).join(', ')}) — 공개 페이지 반영이 지연될 수 있습니다. 같은 도구를 재호출하면 다시 시도됩니다.`
}
