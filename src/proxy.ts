import { NextResponse, type NextRequest } from 'next/server'

import { defaultLocale, isLocale } from './i18n/config'

// Sends visitors without a language prefix to /th or /en (based on a saved choice, then the browser)
// The admin panel opens in Thai unless the user picked another language in their account
// settings. Payload otherwise follows the browser language, which is English on most PCs.
const ADMIN_LANG_COOKIE = 'payload-lng'

function adminInThai(request: NextRequest) {
  if (request.cookies.has(ADMIN_LANG_COOKIE)) return NextResponse.next()
  const headers = new Headers(request.headers)
  const cookie = headers.get('cookie')
  headers.set('cookie', `${cookie ? `${cookie}; ` : ''}${ADMIN_LANG_COOKIE}=th`)
  const response = NextResponse.next({ request: { headers } })
  response.cookies.set(ADMIN_LANG_COOKIE, 'th', { path: '/', maxAge: 60 * 60 * 24 * 365 })
  return response
}

// Payload's "not allowed" page for a signed-in user whose role can't use /admin (Users
// `access.admin`: admins only). Send them to the staff backoffice instead.
const ADMIN_UNAUTHORIZED = /^\/admin\/unauthorized\/?$/

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const first = pathname.split('/')[1] ?? ''
  if (ADMIN_UNAUTHORIZED.test(pathname)) {
    const url = publicUrl(request, '/backoffice')
    url.search = ''
    return NextResponse.redirect(url)
  }
  if (first === 'admin') return adminInThai(request)
  // The staff backoffice has its own TH/EN toggle and no language prefix
  if (first === 'backoffice') return NextResponse.next()
  if (isLocale(first)) return NextResponse.next()

  const saved = request.cookies.get('NEXT_LOCALE')?.value
  const browser = request.headers.get('accept-language')?.toLowerCase().startsWith('en')
    ? 'en'
    : null
  const locale = saved && isLocale(saved) ? saved : (browser ?? defaultLocale)

  return NextResponse.redirect(publicUrl(request, `/${locale}${pathname === '/' ? '' : pathname}`))
}

// Behind a reverse proxy the app is reached over plain http, so build the address from what the
// visitor used (forwarded headers), and never drop a site served over https back to http.
function publicUrl(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone()
  url.pathname = pathname
  const proto = request.headers.get('x-forwarded-proto')?.split(',')[0].trim()
  if (proto === 'https' || process.env.NEXT_PUBLIC_SERVER_URL?.startsWith('https:')) {
    url.protocol = 'https:'
    url.port = ''
  }
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  if (host) url.host = host
  return url
}

export const config = {
  // Skip APIs, Next.js internals, the backoffice and files with an extension; the admin panel only
  // gets its default language set
  matcher: ['/admin/:path*', '/admin', '/((?!admin|api|backoffice|_next|.*\\..*).*)'],
}
