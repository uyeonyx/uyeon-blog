import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/admin/token'

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

  // 로그인 전 요청 경로로 복귀 (MCP OAuth authorize 등) — 내부 절대경로만
  const next = cookieStore.get('login_next')?.value
  cookieStore.delete('login_next')
  const target =
    next?.startsWith('/') && !next.startsWith('//')
      ? new URL(next, request.nextUrl.origin)
      : new URL('/admin', request.nextUrl.origin)
  return NextResponse.redirect(target)
}
