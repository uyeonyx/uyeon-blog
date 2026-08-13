import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { sanitizeNextPath } from '@/lib/admin/token'

export async function GET(request: NextRequest) {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID
  if (!clientId) {
    return Response.json({ error: 'GITHUB_OAUTH_CLIENT_ID is not set' }, { status: 500 })
  }

  const state = crypto.randomUUID()
  const redirectUri = new URL('/api/auth/github/callback', request.nextUrl.origin).toString()

  const authorizeUrl = new URL('https://github.com/login/oauth/authorize')
  authorizeUrl.searchParams.set('client_id', clientId)
  authorizeUrl.searchParams.set('redirect_uri', redirectUri)
  authorizeUrl.searchParams.set('scope', 'read:user')
  authorizeUrl.searchParams.set('state', state)

  const cookieStore = await cookies()
  cookieStore.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 10,
  })

  // 같은 콜백 URL을 관리자 로그인과 댓글 로그인이 공유한다 (GitHub OAuth App은 콜백을 하나만 받는다).
  // 기본값은 admin — intent를 명시하지 않은 기존 진입점의 동작이 바뀌지 않도록 한다.
  // 이전 시도의 잔여 쿠키가 관리자 로그인을 댓글 로그인으로 바꾸지 않게 admin일 때는 지운다.
  if (request.nextUrl.searchParams.get('intent') === 'comment') {
    cookieStore.set('oauth_intent', 'comment', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 10,
    })
  } else {
    cookieStore.delete('oauth_intent')
  }

  // 로그인 후 복귀할 내부 경로 (MCP OAuth authorize 등) — origin 일치로 오픈 리다이렉트 차단
  const next = sanitizeNextPath(request.nextUrl.searchParams.get('next'), request.nextUrl.origin)
  if (next) {
    cookieStore.set('login_next', next, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 10,
    })
  }

  return NextResponse.redirect(authorizeUrl)
}
