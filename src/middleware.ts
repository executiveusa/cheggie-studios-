import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// TODO: auth temporarily disabled - re-enable getToken checks when login is fixed
export async function middleware(req: NextRequest) {
  const response = NextResponse.next()
  response.headers.set('x-request-id', crypto.randomUUID())
  return response
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
