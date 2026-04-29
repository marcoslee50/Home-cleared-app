import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/', '/api/auth/verify', '/api/auth/callback', '/api/auth/google']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (PUBLIC_PATHS.some(p => pathname === p)) return NextResponse.next()
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/manifest') ||
    pathname.startsWith('/icons')
  ) {
    return NextResponse.next()
  }
  const session = req.cookies.get('wgp_session')
  if (session?.value === 'authenticated') return NextResponse.next()
  return NextResponse.redirect(new URL('/', req.url))
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
