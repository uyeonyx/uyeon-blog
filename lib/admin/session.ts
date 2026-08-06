import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { type AdminSession, SESSION_COOKIE, verifySessionToken } from './token'

export type { AdminSession } from './token'
export { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from './token'

export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifySessionToken(token)
}

/** 서버 컴포넌트용 — 미인증이면 로그인 페이지로 redirect */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession()
  if (!session) {
    redirect('/admin/login')
  }
  return session
}

/** route handler용 — 미인증이면 401 Response 반환 */
export async function requireAdminApi(): Promise<AdminSession | Response> {
  const session = await getAdminSession()
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return session
}
