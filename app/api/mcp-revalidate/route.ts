// MCP 도구가 내부 호출하는 캐시 무효화 엔드포인트.
// MCP 도구 콜백은 SSE 스트리밍 응답이 반환된 뒤 실행되어 그 요청의 revalidateTag가
// 유실되므로, 별도 요청(여기)에서 무효화한다 (Next 문서의 webhook 패턴).
import { revalidateTag } from 'next/cache'
import type { NextRequest } from 'next/server'
import { verifyMcpToken } from '@/lib/mcp/auth'

const VALID_TAGS = new Set(['posts', 'projects', 'authors'])

export async function POST(request: NextRequest) {
  const bearer = request.headers.get('authorization')?.replace(/^Bearer /, '')
  if (!(await verifyMcpToken(request, bearer))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const tags: string[] = Array.isArray(body?.tags) ? body.tags.filter(String) : []
  const applied: string[] = []
  for (const tag of tags) {
    if (VALID_TAGS.has(tag)) {
      revalidateTag(tag, { expire: 0 })
      applied.push(tag)
    }
  }
  return Response.json({ ok: true, revalidated: applied })
}
