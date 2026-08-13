// 공개 엔드포인트용 경량 rate limit — 인메모리 고정 윈도우.
// Vercel 람다 인스턴스별로 카운터가 분리되므로 정확한 전역 제한은 아니지만,
// 읽기가 전부 unstable_cache로 캐시되어 있어 남용 방지 목적으로는 충분하다.
// MCP 외에 댓글 API도 쓰므로 윈도우/한도를 호출자가 정할 수 있다 (기본값은 MCP의 원래 값).
const WINDOW_MS = 60_000
const MAX_REQUESTS = 60
const MAX_ENTRIES = 1_000

const buckets = new Map<string, { count: number; resetAt: number }>()

function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  return forwarded?.split(',')[0]?.trim() || 'unknown'
}

export interface RateLimitOptions {
  windowMs?: number
  maxRequests?: number
  /** 용도별로 카운터를 분리한다 — 댓글 작성이 MCP 조회 한도를 잡아먹지 않게 */
  scope?: string
  /** IP 대신 쓸 키 (로그인 사용자는 계정 단위로 센다) */
  identity?: string
}

export function checkRateLimit(
  request: Request,
  options: RateLimitOptions = {}
): { ok: true } | { ok: false; retryAfterSeconds: number } {
  const { windowMs = WINDOW_MS, maxRequests = MAX_REQUESTS, scope = 'default', identity } = options
  const now = Date.now()
  const key = `${scope}:${identity ?? clientIp(request)}`

  // 무한 증가 방지 — 초과 시 만료 항목 정리
  if (buckets.size > MAX_ENTRIES) {
    for (const [entryKey, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(entryKey)
    }
  }

  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true }
  }
  bucket.count += 1
  if (bucket.count > maxRequests) {
    return { ok: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) }
  }
  return { ok: true }
}
