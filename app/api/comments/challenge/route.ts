// 댓글 작성용 PoW 챌린지 발급. 공개 엔드포인트지만 상태가 없어서(서명만) 남용해도 얻을 게 없다.
import type { NextRequest } from 'next/server'
import { issueChallenge } from '@/lib/comments/challenge'
import { checkRateLimit } from '@/lib/mcp/rate-limit'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const limit = checkRateLimit(request, { scope: 'challenge', windowMs: 60_000, maxRequests: 30 })
  if (!limit.ok) {
    return Response.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    )
  }

  return Response.json(issueChallenge(), {
    headers: { 'Cache-Control': 'no-store' },
  })
}
