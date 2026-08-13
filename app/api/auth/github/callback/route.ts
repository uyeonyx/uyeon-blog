import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import {
  createSessionToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  sanitizeNextPath,
} from '@/lib/admin/token'
import {
  createUserSessionToken,
  USER_SESSION_COOKIE,
  USER_SESSION_MAX_AGE,
} from '@/lib/auth/user-token'

export async function GET(request: NextRequest) {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET
  const adminLogin = process.env.ADMIN_GITHUB_LOGIN
  if (!clientId || !clientSecret || !adminLogin) {
    return Response.json({ error: 'OAuth environment variables are not set' }, { status: 500 })
  }

  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')
  const cookieStore = await cookies()
  const expectedState = cookieStore.get('oauth_state')?.value
  cookieStore.delete('oauth_state')

  // 콜백 URL은 관리자 로그인과 댓글 로그인이 공유한다. 쿠키가 없으면 관리자 — 기존 동작이 기본값이다.
  const intent = cookieStore.get('oauth_intent')?.value === 'comment' ? 'comment' : 'admin'
  cookieStore.delete('oauth_intent')

  if (!code || !state || !expectedState || state !== expectedState) {
    return Response.json({ error: 'Invalid OAuth state' }, { status: 400 })
  }

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: new URL('/api/auth/github/callback', request.nextUrl.origin).toString(),
    }),
  })
  const tokenData = await tokenRes.json()
  const accessToken = tokenData.access_token
  if (!accessToken) {
    return Response.json({ error: 'Failed to exchange OAuth code' }, { status: 400 })
  }

  const userRes = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json' },
  })
  const user = await userRes.json()

  // 댓글 로그인 — 누구나 통과시키되 관리자 세션과는 다른 쿠키를 발급한다.
  // 아래 관리자 경로에는 손대지 않는다.
  if (intent === 'comment') {
    if (typeof user?.id !== 'number' || typeof user?.login !== 'string') {
      return Response.json({ error: 'Failed to load GitHub profile' }, { status: 400 })
    }

    const userToken = await createUserSessionToken({
      provider: 'github',
      providerUserId: String(user.id),
      login: user.login,
      name: typeof user.name === 'string' && user.name.trim() ? user.name : user.login,
      avatarUrl: typeof user.avatar_url === 'string' ? user.avatar_url : undefined,
      profileUrl: typeof user.html_url === 'string' ? user.html_url : undefined,
    })
    cookieStore.set(USER_SESSION_COOKIE, userToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: USER_SESSION_MAX_AGE,
    })

    const commentNext = sanitizeNextPath(
      cookieStore.get('login_next')?.value,
      request.nextUrl.origin
    )
    cookieStore.delete('login_next')
    return NextResponse.redirect(new URL(commentNext ?? '/', request.nextUrl.origin))
  }

  if (user?.login !== adminLogin) {
    return Response.json({ error: 'Forbidden: not the blog owner' }, { status: 403 })
  }

  const sessionToken = await createSessionToken(user.login)
  cookieStore.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })

  // 로그인 전 요청 경로로 복귀 (MCP OAuth authorize 등) — origin 일치로 재검증
  const next = sanitizeNextPath(cookieStore.get('login_next')?.value, request.nextUrl.origin)
  cookieStore.delete('login_next')
  const target = new URL(next ?? '/admin', request.nextUrl.origin)
  return NextResponse.redirect(target)
}
