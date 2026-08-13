// 댓글 작성자용 세션 — 관리자 세션(lib/admin/token.ts)과 쿠키·검증 함수를 완전히 분리한다.
// 관리자 게이트가 verifySessionToken 안에 박혀 있어서, 그쪽에 "누구나 통과" 분기를 넣으면
// proxy.ts가 지키는 /admin·/api/admin/* 전체가 열린다.
//
// 서명 키는 ADMIN_SESSION_SECRET을 공유하고(서브키화하면 살아있는 30일 쿠키가 전부 무효),
// 교차 사용은 payload의 typ claim으로 막는다.
// 이 토큰에는 typ: 'user'가 들어가고, 관리자 검증기는 typ가 'user'면 거부한다.
import { jwtVerify, SignJWT } from 'jose'
import { getAdminSessionSecret } from '@/lib/secrets'

export const USER_SESSION_COOKIE = 'user_session'
export const USER_SESSION_MAX_AGE = 60 * 60 * 24 * 30 // 30일

const USER_TOKEN_TYPE = 'user'

export interface UserSession {
  /** 'github' | 'google'(향후) — 익명 댓글은 세션 없이 작성하므로 여기 오지 않는다 */
  provider: string
  /** 제공자의 불변 식별자. GitHub은 numeric id (login은 사용자가 바꿀 수 있다) */
  providerUserId: string
  /** GitHub login 등 핸들 — 표시명과 소유자 판정에 쓴다 */
  login: string
  name: string
  avatarUrl?: string
  profileUrl?: string
}

function getSecret() {
  return new TextEncoder().encode(getAdminSessionSecret())
}

export async function createUserSessionToken(session: UserSession): Promise<string> {
  return new SignJWT({ ...session, typ: USER_TOKEN_TYPE })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${USER_SESSION_MAX_AGE}s`)
    .sign(getSecret())
}

export async function verifyUserSessionToken(token: string): Promise<UserSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    // 관리자 토큰을 댓글 세션으로 승격시키지 않는다 — typ가 없으면 관리자 쪽 토큰이다
    if (payload.typ !== USER_TOKEN_TYPE) return null

    const { provider, providerUserId, login, name, avatarUrl, profileUrl } = payload
    if (
      typeof provider !== 'string' ||
      typeof providerUserId !== 'string' ||
      typeof login !== 'string' ||
      typeof name !== 'string'
    ) {
      return null
    }

    return {
      provider,
      providerUserId,
      login,
      name,
      avatarUrl: typeof avatarUrl === 'string' ? avatarUrl : undefined,
      profileUrl: typeof profileUrl === 'string' ? profileUrl : undefined,
    }
  } catch {
    return null
  }
}

/** 이 세션이 블로그 주인인지 — 서버에서만 판정하므로 클라이언트가 위조할 수 없다 */
export function isOwnerSession(session: UserSession): boolean {
  const adminLogin = process.env.ADMIN_GITHUB_LOGIN
  return (
    !!adminLogin &&
    session.provider === 'github' &&
    session.login.toLowerCase() === adminLogin.toLowerCase()
  )
}
