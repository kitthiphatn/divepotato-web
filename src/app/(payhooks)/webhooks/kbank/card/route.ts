import { isLocale } from '@/i18n/config'
import { payPath } from '@/lib/payments/link'
import { payCardAction } from '@/site/actions/pay'

// Form action of KBank's card widget on the pay page: /webhooks/kbank/card?locale=&code=&t=.
// The widget posts only a one-time card token (plus mid and paymentMethods); the amount comes
// from the booking or order on the server, as for every other card payment. A 3-D Secure charge
// sends the customer to KBank's redirect_url; otherwise straight back to the pay page, which
// shows the result.
export async function POST(request: Request) {
  const q = new URL(request.url).searchParams
  const lc = q.get('locale') ?? ''
  const locale = isLocale(lc) ? lc : 'th'
  const code = q.get('code') ?? ''
  const token = q.get('t') ?? ''
  if (!code || !token) return see(`/${locale}`, locale)
  const form = await request.formData().catch(() => null)
  const cardToken = String(form?.get('token') ?? '')
  const r = await payCardAction({ locale, code, token, cardToken })
  const back = payPath(locale, code, token)
  return see(r.ok && r.redirect?.startsWith('https://') ? r.redirect : back, locale)
}

// 303 so the browser follows with a GET. The language is remembered because KBank's 3-D Secure
// callback (/webhooks/kbank/return) comes back without it.
const see = (location: string, locale: string) =>
  new Response(null, {
    status: 303,
    headers: {
      Location: location,
      'Set-Cookie': `NEXT_LOCALE=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`,
      'Cache-Control': 'no-store',
    },
  })
