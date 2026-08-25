// MCP 도구 콜백에서 revalidateTag를 직접 호출하면 유실될 수 있다 — SSE 스트리밍 구조에서는
// 라우트 핸들러의 Response가 도구 실행 전에 반환되어 Next가 pending revalidation을 이미
// flush한 뒤이기 때문. 그래서 인프로세스 호출을 먼저 시도하고(요청 컨텍스트가 살아 있으면 공짜),
// 자기 자신의 /api/mcp-revalidate로 보내는 내부 요청으로 확실히 마무리한다.
import { getPublicOrigin } from 'mcp-handler'
import { revalidateTag } from 'next/cache'
import siteMetadata from '@/data/siteMetadata'

// 모듈 전역이라 동시 요청이 서로의 origin을 덮어쓸 수 있다 — 단일 도메인 배포에서는 같은 값이므로
// 무해하고, 캡처가 누락된 경우만 canonical siteUrl로 폴백한다.
let origin: string | null = null

/** MCP 라우트 핸들러 진입 직후 호출 — 내부 revalidate 요청에 쓸 origin 캡처 */
export function captureRequestContext(request: Request) {
  origin = getPublicOrigin(request)
}

export type RevalidateTag = 'posts' | 'projects' | 'authors' | 'tags'

export interface RevalidateResult {
  ok: boolean
  error?: string
}

/**
 * 태그 무효화. 여러 태그를 **한 번의 내부 요청**으로 처리한다 — 태그마다 왕복을 내면
 * 그 지연이 그대로 도구 응답에 더해진다.
 * 실패해도 던지지 않는다 — DB 쓰기는 이미 끝났으므로 호출자는 결과를 경고로만 실어 보낸다.
 */
export async function mcpRevalidateTags(tags: RevalidateTag[]): Promise<RevalidateResult> {
  const unique = [...new Set(tags)]
  if (unique.length === 0) return { ok: true }

  // 요청 컨텍스트가 아직 살아 있으면 여기서 끝난다. 스트리밍 이후라 유실되더라도
  // 아래 내부 요청이 받아주므로, 실패는 조용히 무시해도 안전하다.
  for (const tag of unique) {
    try {
      revalidateTag(tag, { expire: 0 })
    } catch {
      // 요청 컨텍스트 밖 — 내부 요청 경로가 처리한다
    }
  }

  const target = origin ?? siteMetadata.siteUrl
  try {
    // 3초 — DB 쓰기가 끝난 뒤의 후처리이므로 도구 응답을 오래 붙잡을 이유가 없다.
    const res = await fetch(`${target}/api/mcp-revalidate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.MCP_AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tags: unique }),
      signal: AbortSignal.timeout(3_000),
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

/**
 * 무효화 실패를 도구 응답용 경고 문자열로. 성공이면 null.
 * 재호출을 권하지 않는다 — 저장은 이미 끝났고, 같은 도구를 다시 부르면 본문 재컴파일까지
 * 통째로 다시 도는 가장 비싼 재시도가 된다.
 */
export function revalidateWarning(result: RevalidateResult): string | null {
  if (result.ok) return null
  return `캐시 무효화 실패(${result.error}) — 저장은 정상 완료되었고 공개 페이지 반영만 지연됩니다. 이 도구를 다시 호출할 필요는 없습니다.`
}
