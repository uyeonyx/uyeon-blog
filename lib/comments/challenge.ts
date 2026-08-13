// 캡차 대체 — 외부 서비스 없이 봇을 걸러낸다.
//
// 서버가 HMAC으로 서명한 챌린지를 주고, 클라이언트는 sha256(salt:nonce)의 앞 N비트가 0이 되는
// nonce를 찾아 함께 제출한다. 사용자는 아무것도 풀지 않는다 — 폼에 들어온 순간 백그라운드에서
// 계산이 시작되고, 최소 체류 시간(3초)을 채우는 사이에 끝난다.
//
// 목표는 "단순 봇 차단"이지 "결연한 공격자 차단"이 아니다. 대량 스팸에 계산 비용을 물리는 게 전부다.
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

/**
 * 앞자리 0 비트 수. 16비트 = 기대 65,536회 ≈ 최신 노트북 0.8초, 보급형 모바일 2~3초.
 * 18비트는 같은 기기에서 3초를 넘겨 체감이 나빠 채택하지 않았다.
 */
const DIFFICULTY = 16
/** 과거에 더 낮은 난이도로 발급된 챌린지를 재사용하지 못하게 하는 하한 */
const MIN_DIFFICULTY = 14
const TTL_MS = 5 * 60 * 1000
/** 폼을 받자마자 제출하는 것은 사람이 아니다 */
const MIN_ELAPSED_MS = 3000
const MAX_USED_SALTS = 5000

export interface IssuedChallenge {
  salt: string
  difficulty: number
  issuedAt: number
  exp: number
  sig: string
}

export type ChallengeVerdict = { ok: true } | { ok: false; reason: string }

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret) {
    throw new Error('ADMIN_SESSION_SECRET is not set')
  }
  return secret
}

function sign(salt: string, difficulty: number, issuedAt: number, exp: number): string {
  return createHmac('sha256', getSecret())
    .update(`${salt}.${difficulty}.${issuedAt}.${exp}`)
    .digest('hex')
}

export function issueChallenge(now = Date.now()): IssuedChallenge {
  const salt = randomBytes(16).toString('hex')
  const exp = now + TTL_MS
  return {
    salt,
    difficulty: DIFFICULTY,
    issuedAt: now,
    exp,
    sig: sign(salt, DIFFICULTY, now, exp),
  }
}

// 한 챌린지로 여러 댓글을 쓰지 못하게 한다. 서버리스 인스턴스별로 갈리지만,
// 서명과 만료가 이미 대부분을 막으므로 남용 억제로는 충분하다.
const usedSalts = new Map<string, number>()

function markUsed(salt: string, exp: number, now: number) {
  if (usedSalts.size > MAX_USED_SALTS) {
    for (const [key, expiresAt] of usedSalts) {
      if (expiresAt <= now) usedSalts.delete(key)
    }
  }
  usedSalts.set(salt, exp)
}

export function hasLeadingZeroBits(digest: Buffer, bits: number): boolean {
  const fullBytes = bits >> 3
  for (let i = 0; i < fullBytes; i++) {
    if (digest[i] !== 0) return false
  }
  const remainder = bits & 7
  if (remainder === 0) return true
  return digest[fullBytes] >> (8 - remainder) === 0
}

function signaturesMatch(expected: string, actual: string): boolean {
  const a = Buffer.from(expected, 'hex')
  const b = Buffer.from(actual, 'hex')
  if (a.length === 0 || a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export interface ChallengeSubmission {
  salt?: unknown
  difficulty?: unknown
  issuedAt?: unknown
  exp?: unknown
  sig?: unknown
  nonce?: unknown
}

/**
 * 제출된 챌린지를 검증하고, 통과하면 salt를 소모 처리한다.
 * 실패 사유는 호출자가 로깅용으로만 쓰고 클라이언트에는 뭉뚱그려 돌려준다
 * (어떤 검사에 걸렸는지 알려주면 우회를 도와주는 꼴이 된다).
 */
export function verifyChallenge(input: ChallengeSubmission, now = Date.now()): ChallengeVerdict {
  const { salt, difficulty, issuedAt, exp, sig, nonce } = input

  if (
    typeof salt !== 'string' ||
    typeof sig !== 'string' ||
    typeof nonce !== 'string' ||
    typeof difficulty !== 'number' ||
    typeof issuedAt !== 'number' ||
    typeof exp !== 'number'
  ) {
    return { ok: false, reason: 'malformed' }
  }

  if (!Number.isInteger(difficulty) || difficulty < MIN_DIFFICULTY || difficulty > 32) {
    return { ok: false, reason: 'difficulty out of range' }
  }

  if (!signaturesMatch(sign(salt, difficulty, issuedAt, exp), sig)) {
    return { ok: false, reason: 'bad signature' }
  }

  if (now >= exp) {
    return { ok: false, reason: 'expired' }
  }

  if (now - issuedAt < MIN_ELAPSED_MS) {
    return { ok: false, reason: 'too fast' }
  }

  if (usedSalts.has(salt)) {
    return { ok: false, reason: 'salt reused' }
  }

  const digest = createHash('sha256').update(`${salt}:${nonce}`).digest()
  if (!hasLeadingZeroBits(digest, difficulty)) {
    return { ok: false, reason: 'proof of work failed' }
  }

  markUsed(salt, exp, now)
  return { ok: true }
}
