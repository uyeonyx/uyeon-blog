// 익명 댓글의 짧은 수명 삭제 권한.
// 익명 작성자는 신원을 확인할 수 없으므로, 작성 응답으로 서명된 토큰을 주고 클라이언트가
// localStorage에 보관한다. DB 컬럼이 필요 없고, 만료되면 자연히 권한이 사라진다.
import { createHmac, timingSafeEqual } from 'node:crypto'

const TTL_MS = 15 * 60 * 1000

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret) {
    throw new Error('ADMIN_SESSION_SECRET is not set')
  }
  return secret
}

function sign(commentId: string, exp: number): string {
  return createHmac('sha256', getSecret()).update(`${commentId}.${exp}`).digest('hex')
}

export function createDeleteToken(commentId: string, now = Date.now()): string {
  const exp = now + TTL_MS
  return `${exp}.${sign(commentId, exp)}`
}

export function verifyDeleteToken(commentId: string, token: unknown, now = Date.now()): boolean {
  if (typeof token !== 'string') return false
  const [expPart, sig] = token.split('.')
  const exp = Number(expPart)
  if (!Number.isFinite(exp) || !sig) return false
  if (now >= exp) return false

  const expected = Buffer.from(sign(commentId, exp), 'hex')
  const actual = Buffer.from(sig, 'hex')
  if (expected.length === 0 || expected.length !== actual.length) return false
  return timingSafeEqual(expected, actual)
}
