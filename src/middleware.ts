import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

const PROTECTED_DASHBOARD_PATTERN = /^\/dashboard(\/.*)?$/
const PUBLIC_API_PATTERNS = [
  /^\/api\/health/,
  /^\/api\/ready/,
  /^\/api\/auth\/.*/,
  /^\/api\/telemetry/,
]

function isPublicApiRoute(pathname: string): boolean {
  return PUBLIC_API_PATTERNS.some((pattern) => pattern.test(pathname))
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const requestId = crypto.randomUUID()

  const response = NextResponse.next()
  response.headers.set('x-request-id', requestId)

  const needsAuth =
    PROTECTED_DASHBOARD_PATTERN.test(pathname) ||
    (pathname.startsWith('/api/') && !isPublicApiRoute(pathname))

  if (needsAuth) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

    if (PROTECTED_DASHBOARD_PATTERN.test(pathname) && !token) {
      const loginUrl = new URL('/auth/login', req.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }

    if (pathname.startsWith('/api/') && !isPublicApiRoute(pathname) && !token) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401, headers: { 'x-request-id': requestId } }
      )
    }
  }

  return response
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
