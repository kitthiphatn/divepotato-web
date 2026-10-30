import config from '@payload-config'
import { getPayload } from 'payload'

import { providerReady } from '@/lib/payments/config'
import { reconcileRef } from '@/lib/payments/confirm'

// Stripe webhook (register https://<site>/webhooks/stripe in the Stripe dashboard for the
// payment_intent.* events). The body is not trusted, so no signing secret is needed: only the
// PaymentIntent id is taken from it and the intent is read back from Stripe.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    type?: string
    data?: { object?: { object?: string; id?: string } }
  } | null
  const obj = body?.data?.object
  const id = obj?.object === 'payment_intent' ? obj.id : undefined
  if (!id || !/^pi_[A-Za-z0-9_]+$/.test(id)) return Response.json({ ignored: true })
  if (!providerReady('stripe')) return Response.json({ error: 'not configured' }, { status: 503 })
  const payload = await getPayload({ config })
  try {
    const status = await reconcileRef(payload, 'stripe', id)
    return Response.json({ ok: true, status })
  } catch (err) {
    payload.logger.error({ err }, `Stripe webhook for ${id} failed`)
    // A 5xx makes Stripe retry later
    return Response.json({ error: 'failed' }, { status: 500 })
  }
}
