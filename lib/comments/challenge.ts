// 캡차 대체 — 외부 서비스 없이 봇을 걸러낸다.
//
// 서버가 HMAC으로 서명한 챌린지를 주고, 클라이언트는 sha256(salt:nonce)의 앞 N비트가 0이 되는
// nonce를 찾아 함께 제출한다. 사용자는 아무것도 풀지 않는다 — 폼에 들어온 순간 백그라운드에서
// 계산이 시작되고, 최소 체류 시간(3초)을 채우는 사이에 끝난다.
//
// 목표는 "단순 봇 차단"이지 "결연한 공격자 차단"이 아니다. 대량 스팸에 계산 비용을 물리는 게 전부다.
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { consumeNonce } from '@/lib/db/nonces'
import { getAdminSessionSecret } from '@/lib/secrets'

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

export interface IssuedChallenge {
  salt: string
  difficulty: number
  issuedAt: number
  exp: number
  sig: string
}

export type ChallengeVerdict = { ok: true } | { ok: false; reason: string }

// admin 키에서 파생한 용도별 서브키 — admin 세션 토큰과 서명 재료를 공유하지 않는다.
// 챌린지는 5분 TTL이라 키가 바뀌어도 진행 중인 것 1회 실패 후 재시도로 회복된다.
function getSecret(): string {
  return createHash('sha256').update(`comment-challenge:${getAdminSessionSecret()}`).digest('hex')
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
 * 소모 기록은 DB(used_nonces) — 인메모리 Map은 서버리스 팬아웃에서 인스턴스마다 갈려
 * 한 번 푼 PoW를 다른 인스턴스에 재사용할 수 있었다.
 * 실패 사유는 호출자가 로깅용으로만 쓰고 클라이언트에는 뭉뚱그려 돌려준다
 * (어떤 검사에 걸렸는지 알려주면 우회를 도와주는 꼴이 된다).
 */
export async function verifyChallenge(
  input: ChallengeSubmission,
  now = Date.now()
): Promise<ChallengeVerdict> {
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

  const digest = createHash('sha256').update(`${salt}:${nonce}`).digest()
  if (!hasLeadingZeroBits(digest, difficulty)) {
    return { ok: false, reason: 'proof of work failed' }
  }

  // 모든 검증 통과 후에만 소모 — 실패 제출이 남의 salt를 태우지 않게
  const fresh = await consumeNonce(salt, 'pow', new Date(exp))
  if (!fresh) {
    return { ok: false, reason: 'salt reused' }
  }
  return { ok: true }
}
