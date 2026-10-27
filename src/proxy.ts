import { NextResponse, type NextRequest } from 'next/server'

import { defaultLocale, isLocale } from './i18n/config'

// Sends visitors without a language prefix to /th or /en (based on a saved choice, then the browser)
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const first = pathname.split('/')[1] ?? ''
  if (isLocale(first)) return NextResponse.next()

  const saved = request.cookies.get('NEXT_LOCALE')?.value
  const browser = request.headers.get('accept-language')?.toLowerCase().startsWith('en')
    ? 'en'
    : null
  const locale = saved && isLocale(saved) ? saved : (browser ?? defaultLocale)

  // Behind a reverse proxy the app is reached over plain http, so build the address from what the
  // visitor used (forwarded headers), and never drop a site served over https back to http.
  const url = request.nextUrl.clone()
  url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`
  const proto = request.headers.get('x-forwarded-proto')?.split(',')[0].trim()
  if (proto === 'https' || process.env.NEXT_PUBLIC_SERVER_URL?.startsWith('https:')) {
    url.protocol = 'https:'
    url.port = ''
  }
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  if (host) url.host = host
  return NextResponse.redirect(url)
}

export const config = {
  // Skip the admin panel, APIs, Next.js internals and files with an extension
  matcher: ['/((?!admin|api|_next|.*\\..*).*)'],
}
