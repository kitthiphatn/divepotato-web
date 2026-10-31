import config from '@payload-config'
import { getPayload } from 'payload'

import { relId } from '@/hooks/bookings'
import { isLocale } from '@/i18n/config'
import { payPath } from '@/lib/payments/link'

// Where KBank sends the customer back. Two cases:
// - the QR widget's form action, which we give the pay link: ?locale=&code=&t=
// - the card 3-D Secure Callback URL registered in KBank's merchant portal, which carries only
//   the charge id (objectId, by POST or GET). The charge id is random and only KBank and the
//   customer's browser see it; it is looked up among our KBank payments to find the pay link.
// Nothing here confirms a payment: the pay page re-reads pending charges from KBank on load.
async function handle(request: Request) {
  const q = new URL(request.url).searchParams
  const lc = q.get('locale') ?? ''
  const code = q.get('code')
  const token = q.get('t')
  if (code && token) return see(payPath(isLocale(lc) ? lc : 'th', code, token))

  const form = request.method === 'POST' ? await request.formData().catch(() => null) : null
  const pick = (k: string) => String(form?.get(k) ?? q.get(k) ?? '')
  const id = pick('objectId') || pick('chargeId')
  if (!/^chrg_[A-Za-z0-9_]+$/.test(id)) return see('/')
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'payments',
    where: { and: [{ provider: { equals: 'kbank' } }, { ref: { equals: id } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const p = docs[0]
  const orderId = relId(p?.order)
  const bookingId = relId(p?.booking)
  const owner = orderId
    ? await payload.findByID({ collection: 'orders', id: orderId, depth: 0, overrideAccess: true })
    : bookingId
      ? await payload.findByID({ collection: 'bookings', id: bookingId, depth: 0, overrideAccess: true })
      : null
  if (!owner?.code || !owner.payToken) return see('/')
  // No language prefix: the proxy adds the visitor's saved one (set when the card form was sent)
  return see(`/pay/${encodeURIComponent(owner.code)}?t=${encodeURIComponent(owner.payToken)}`)
}

const see = (location: string) =>
  new Response(null, { status: 303, headers: { Location: location, 'Cache-Control': 'no-store' } })

export const GET = handle
export const POST = handle
