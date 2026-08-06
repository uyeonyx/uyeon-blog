// 공개 MCP 엔드포인트용 경량 rate limit — 인메모리 고정 윈도우.
// Vercel 람다 인스턴스별로 카운터가 분리되므로 정확한 전역 제한은 아니지만,
// 읽기가 전부 unstable_cache로 캐시되어 있어 남용 방지 목적으로는 충분하다.
const WINDOW_MS = 60_000
const MAX_REQUESTS = 60
const MAX_ENTRIES = 1_000

const buckets = new Map<string, { count: number; resetAt: number }>()

function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  return forwarded?.split(',')[0]?.trim() || 'unknown'
}

export function checkRateLimit(
  request: Request
): { ok: true } | { ok: false; retryAfterSeconds: number } {
  const now = Date.now()
  const ip = clientIp(request)

  // 무한 증가 방지 — 초과 시 만료 항목 정리
  if (buckets.size > MAX_ENTRIES) {
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key)
    }
  }

  const bucket = buckets.get(ip)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return { ok: true }
  }
  bucket.count += 1
  if (bucket.count > MAX_REQUESTS) {
    return { ok: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) }
  }
  return { ok: true }
}
