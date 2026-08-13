// 쿠키에서 댓글 작성자 세션을 읽는다 — lib/admin/session.ts와 같은 패턴이지만 별도 쿠키를 본다.
import { cookies } from 'next/headers'
import { USER_SESSION_COOKIE, type UserSession, verifyUserSessionToken } from './user-token'

export type { UserSession } from './user-token'
export {
  createUserSessionToken,
  isOwnerSession,
  USER_SESSION_COOKIE,
  USER_SESSION_MAX_AGE,
} from './user-token'

export async function getUserSession(): Promise<UserSession | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(USER_SESSION_COOKIE)?.value
  if (!token) return null
  return verifyUserSessionToken(token)
}
