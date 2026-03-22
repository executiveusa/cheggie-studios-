import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'

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

export default auth((req: NextRequest & { auth: unknown }) => {
  const { pathname } = req.nextUrl
  const requestId = crypto.randomUUID()

  const response = NextResponse.next()
  response.headers.set('x-request-id', requestId)

  const session = (req as unknown as { auth: { user?: unknown } | null }).auth

  // Protect /dashboard/* routes
  if (PROTECTED_DASHBOARD_PATTERN.test(pathname)) {
    if (!session?.user) {
      const loginUrl = new URL('/auth/login', req.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Protect /api/* routes (except public ones)
  if (pathname.startsWith('/api/') && !isPublicApiRoute(pathname)) {
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401, headers: { 'x-request-id': requestId } }
      )
    }
  }

  return response
})

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
