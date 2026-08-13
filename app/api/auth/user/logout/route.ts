// 댓글 작성자 로그아웃 — user_session만 지운다.
// /api/auth/logout(관리자용)은 admin_session을 지우고 /admin/login으로 보내므로 여기 쓰지 않는다.
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { sanitizeNextPath } from '@/lib/admin/token'
import { USER_SESSION_COOKIE } from '@/lib/auth/user-token'

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  cookieStore.delete(USER_SESSION_COOKIE)

  // 읽던 글로 돌려보낸다 — origin 일치로 오픈 리다이렉트를 막는다
  const next = sanitizeNextPath(request.nextUrl.searchParams.get('next'), request.nextUrl.origin)
  return NextResponse.redirect(new URL(next ?? '/', request.nextUrl.origin), { status: 303 })
}
