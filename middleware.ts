import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const { pathname } = req.nextUrl

    // Protect admin routes
    if (pathname.startsWith('/admin') && token?.role !== 'admin') {
      return NextResponse.redirect(new URL('/', req.url))
    }

    // Pass the pathname as a header so the (main) layout can read it
    const response = NextResponse.next()
    response.headers.set('x-pathname', pathname)
    return response
  },
  {
    callbacks: {
      authorized({ token, req }) {
        const { pathname } = req.nextUrl
        // Always allow public routes
        if (
          pathname === '/login' ||
          pathname === '/signup' ||
          pathname === '/setup' ||
          pathname.startsWith('/api/public') ||
          pathname.startsWith('/api/auth') ||
          pathname.startsWith('/api/strava/callback') ||
          pathname.startsWith('/api/setup') ||
          pathname.startsWith('/api/invite') ||
          pathname.startsWith('/api/signup')
        ) {
          return true
        }
        return !!token
      },
    },
  }
)

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico|jpg|jpeg|gif|webp)$).*)'],
}
