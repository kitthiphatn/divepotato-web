import config from '@payload-config'
import { getPayload } from 'payload'

import { providerReady } from '@/lib/payments/config'
import { reconcileRef } from '@/lib/payments/confirm'
import { verifyKbankChecksum } from '@/lib/payments/kbank'

// KBank webhook (the Notify URL registered in KBank's merchant portal: https://<site>/webhooks/kbank),
// for card charges and QR payments. The checksum (made with our secret key) must match, and even
// then the body is not trusted: only the charge id (card) or order id (QR) is taken from it and
// the payment is read back from KBank. KBank wants a 200 within 10 s, else it retries up to 3 times.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return Response.json({ ignored: true })
  if (!providerReady('kbank')) return Response.json({ error: 'not configured' }, { status: 503 })
  if (!verifyKbankChecksum(body, process.env.KBANK_SECRET_KEY?.trim() ?? ''))
    return Response.json({ error: 'bad checksum' }, { status: 401 })
  // QR payments carry the order id we stored; card charges their charge id
  const source = body.source as { object?: unknown } | null | undefined
  const qr = body.object === 'qr' || source?.object === 'qr' || body.order_id != null
  const id = String((qr ? body.order_id : body.id) ?? '')
  if (!(qr ? /^order_[A-Za-z0-9_]+$/ : /^chrg_[A-Za-z0-9_]+$/).test(id))
    return Response.json({ ignored: true })
  const payload = await getPayload({ config })
  try {
    const status = await reconcileRef(payload, 'kbank', id)
    return Response.json({ ok: true, status })
  } catch (err) {
    payload.logger.error({ err }, `KBank webhook for ${id} failed`)
    // A 5xx makes KBank retry later
    return Response.json({ error: 'failed' }, { status: 500 })
  }
}
