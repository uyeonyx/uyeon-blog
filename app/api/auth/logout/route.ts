import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { SESSION_COOKIE } from '@/lib/admin/token'

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
  return NextResponse.redirect(new URL('/admin/login', request.nextUrl.origin), { status: 303 })
}
