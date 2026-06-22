import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // Security headers
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')

  // Защита API: разрешаем POST только с того же origin
  if (req.nextUrl.pathname.startsWith('/api/') && req.method === 'POST') {
    const origin = req.headers.get('origin')
    const host = req.headers.get('host')
    if (origin && host) {
      try {
        if (new URL(origin).host !== host) {
          return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 })
        }
      } catch {
        return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 })
      }
    }
  }
  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
