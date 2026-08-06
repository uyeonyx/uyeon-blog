// 엣지(proxy)와 서버 양쪽에서 쓰는 토큰 유틸 — Next 서버 전용 API를 import하지 않는다
import { jwtVerify, SignJWT } from 'jose'

export const SESSION_COOKIE = 'admin_session'
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7일

export interface AdminSession {
  login: string
}

function getSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret) {
    throw new Error('ADMIN_SESSION_SECRET is not set')
  }
  return new TextEncoder().encode(secret)
}

export async function createSessionToken(login: string): Promise<string> {
  return new SignJWT({ login })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret())
}

export async function verifySessionToken(token: string): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    const login = payload.login
    if (typeof login !== 'string' || login !== process.env.ADMIN_GITHUB_LOGIN) {
      return null
    }
    return { login }
  } catch {
    return null
  }
}
