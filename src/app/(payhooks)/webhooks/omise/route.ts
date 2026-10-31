import config from '@payload-config'
import { getPayload } from 'payload'

import { providerReady } from '@/lib/payments/config'
import { reconcileRef } from '@/lib/payments/confirm'

// Omise webhook (register https://<site>/webhooks/omise in the Omise dashboard). The body is not
// trusted: only the charge id is taken from it and the charge is read back from Omise.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    object?: string
    key?: string
    data?: { object?: string; id?: string }
  } | null
  const id = body?.data?.object === 'charge' ? body.data.id : undefined
  if (!id || !/^chrg_[A-Za-z0-9_]+$/.test(id)) return Response.json({ ignored: true })
  if (!providerReady('omise')) return Response.json({ error: 'not configured' }, { status: 503 })
  const payload = await getPayload({ config })
  try {
    const status = await reconcileRef(payload, 'omise', id)
    return Response.json({ ok: true, status })
  } catch (err) {
    payload.logger.error({ err }, `Omise webhook for ${id} failed`)
    // A 5xx makes Omise retry later
    return Response.json({ error: 'failed' }, { status: 500 })
  }
}
