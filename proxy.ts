import { type NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/admin/token'

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 로그인 페이지 자체는 통과
  if (pathname === '/admin/login') {
    return NextResponse.next()
  }

  // 심층 방어: 뮤테이션 API는 동일 출처 요청만 (SameSite=Lax는 site 단위라
  // 서브도메인 XSS 한 방에 뚫린다 — Origin은 origin 단위로 좁힌다)
  if (pathname.startsWith('/api/admin/') && request.method !== 'GET') {
    const origin = request.headers.get('origin')
    if (origin) {
      let originHost: string | null = null
      try {
        originHost = new URL(origin).host
      } catch {
        // 파싱 불가 Origin은 불일치로 취급
      }
      if (originHost !== request.nextUrl.host) {
        return Response.json({ error: 'invalid origin' }, { status: 403 })
      }
    }
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = token ? await verifySessionToken(token) : null

  if (session) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/api/')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const loginUrl = request.nextUrl.clone()
  loginUrl.pathname = '/admin/login'
  loginUrl.search = ''
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
