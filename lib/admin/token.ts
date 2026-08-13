// 엣지(proxy)와 서버 양쪽에서 쓰는 토큰 유틸 — Next 서버 전용 API를 import하지 않는다
import { jwtVerify, SignJWT } from 'jose'
import { getAdminSessionSecret } from '@/lib/secrets'

export const SESSION_COOKIE = 'admin_session'
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7일

export interface AdminSession {
  login: string
}

function getSecret() {
  return new TextEncoder().encode(getAdminSessionSecret())
}

export async function createSessionToken(login: string): Promise<string> {
  return new SignJWT({ login })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret())
}

/**
 * 로그인 후 복귀할 내부 경로를 안전하게 정규화한다.
 * `startsWith('//')` 가드만으로는 `/\evil.com`처럼 URL 파서가 백슬래시를 슬래시로
 * 바꿔 외부 호스트로 해석하는 오픈 리다이렉트를 막지 못하므로, origin 일치로 검증한다.
 * 통과하면 내부 pathname+search를 반환, 아니면 null.
 */
export function sanitizeNextPath(next: string | undefined | null, origin: string): string | null {
  if (typeof next !== 'string' || !next.startsWith('/')) return null
  try {
    const url = new URL(next, origin)
    if (url.origin !== origin) return null
    return url.pathname + url.search
  } catch {
    return null
  }
}

export async function verifySessionToken(token: string): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    // 댓글 작성자 토큰(lib/auth/user-token.ts)은 같은 시크릿으로 서명되므로 typ로 걸러낸다.
    // 이게 없으면 주인이 댓글용으로 발급받은 토큰이 관리자 토큰으로 통과할 수 있다.
    if (payload.typ === 'user') {
      return null
    }
    const login = payload.login
    if (typeof login !== 'string' || login !== process.env.ADMIN_GITHUB_LOGIN) {
      return null
    }
    return { login }
  } catch {
    return null
  }
}
