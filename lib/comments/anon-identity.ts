// 익명 작성자를 "같은 브라우저"까지 이어 붙이는 신원.
//
// 두 가지를 동시에 맡는다: 아바타 연속성(같은 브라우저면 같은 그림)과 작성자 판정
// (같은 브라우저면 자기 댓글을 고치고 지울 수 있다).
//
// 왜 쿠키인가: localStorage에 두면 클라이언트가 보낸 값을 서버가 그대로 믿게 되고, 남의 시드를
// 복사해 아바타를 흉내내거나 남의 댓글을 건드릴 수 있다. httpOnly 쿠키는 JS로 못 읽으므로
// 그 경로가 막힌다. 서명 토큰과 달리 사용자가 쿠키를 지우면 그 순간 권한이 사라지므로,
// 회수 수단으로서의 만료 시간도 필요 없다.
//
// 왜 원본을 저장하지 않는가: DB와 공개 응답에는 HMAC으로 파생한 시드만 넣는다. 시드에서
// anon_id를 역산할 수 없으니, 응답에 실려 나간 시드를 보고 남의 쿠키를 만들어 낼 수 없다.
import { createHmac, randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'

export const ANON_ID_COOKIE = 'anon_id'
const ANON_ID_MAX_AGE = 60 * 60 * 24 * 365 // 1년
/**
 * 시드 길이. 아바타에는 앞 16자면 충분하지만 이 값이 곧 작성자 판정 근거이므로 넉넉히 잡는다
 * (자르는 위치가 앞이라 길이를 늘려도 기존 아바타 그림은 그대로다).
 */
const SEED_LENGTH = 32

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret) {
    throw new Error('ADMIN_SESSION_SECRET is not set')
  }
  return secret
}

/** 쿠키 값이 우리가 발급한 모양인지 — 손으로 넣은 값이 시드 계산에 섞이지 않게 한다 */
function isWellFormed(value: string): boolean {
  return /^[0-9a-f]{32}$/.test(value)
}

/**
 * 익명 시드를 얻고, 쿠키가 없거나 망가져 있으면 새로 발급한다. 댓글을 쓸 때만 쓴다.
 * 매 작성마다 만료를 갱신하므로 꾸준히 다는 사람의 신원은 계속 유지된다.
 * Route Handler에서만 부를 것 — 쿠키를 쓴다.
 */
export async function getOrCreateAnonSeed(): Promise<string> {
  const cookieStore = await cookies()
  const existing = cookieStore.get(ANON_ID_COOKIE)?.value
  const anonId = existing && isWellFormed(existing) ? existing : randomBytes(16).toString('hex')

  cookieStore.set(ANON_ID_COOKIE, anonId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ANON_ID_MAX_AGE,
  })

  return deriveSeed(anonId)
}

/**
 * 지금 요청자의 시드를 읽기만 한다 — 없으면 null.
 * 권한 판정용이므로 여기서 쿠키를 새로 심지 않는다 (글을 읽기만 한 사람에게 신원을 붙일 이유가 없다).
 */
export async function readAnonSeed(): Promise<string | null> {
  const cookieStore = await cookies()
  const anonId = cookieStore.get(ANON_ID_COOKIE)?.value
  if (!anonId || !isWellFormed(anonId)) return null
  return deriveSeed(anonId)
}

export function deriveSeed(anonId: string): string {
  return createHmac('sha256', getSecret())
    .update(`anon-avatar:${anonId}`)
    .digest('hex')
    .slice(0, SEED_LENGTH)
}
