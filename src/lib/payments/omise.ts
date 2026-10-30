// Omise REST adapter (https://docs.opn.ooo/charges-api). Server only: uses OMISE_SECRET_KEY with
// HTTP basic auth. Card numbers never reach us; the browser turns them into a token with Omise.js.
import { ProviderError, type Adapter, type Charge, type ChargeInput } from './types'

const API = 'https://api.omise.co'

type OmiseCharge = {
  object: 'charge'
  id: string
  status: 'pending' | 'successful' | 'failed' | 'expired' | 'reversed'
  paid?: boolean
  amount: number
  currency: string
  metadata?: Record<string, unknown> | null
  failure_message?: string | null
  authorize_uri?: string | null
  expires_at?: string | null
  source?: {
    type?: string
    scannable_code?: { image?: { download_uri?: string } | null } | null
  } | null
}

async function call<T>(method: 'GET' | 'POST', path: string, body?: Record<string, unknown>) {
  const key = process.env.OMISE_SECRET_KEY
  if (!key) throw new ProviderError('OMISE_SECRET_KEY is not set')
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
  })
  const json = (await res.json().catch(() => null)) as (T & { object?: string; message?: string }) | null
  if (!res.ok || !json || json.object === 'error')
    throw new ProviderError(`Omise ${path}: ${json?.message ?? res.status}`)
  return json
}

function toCharge(c: OmiseCharge): Charge {
  const qr = c.source?.type === 'promptpay'
  return {
    id: c.id,
    status:
      c.status === 'successful' && c.paid !== false
        ? 'succeeded'
        : c.status === 'pending'
          ? 'pending'
          : 'failed',
    amount: c.amount / 100,
    currency: c.currency.toLowerCase(),
    bookingCode: typeof c.metadata?.booking === 'string' ? c.metadata.booking : null,
    method: qr ? 'promptpay' : 'card',
    message: c.failure_message ?? undefined,
    authorizeUri: c.authorize_uri ?? undefined,
    qrImage: c.source?.scannable_code?.image?.download_uri ?? undefined,
    expiresAt: c.expires_at ?? undefined,
  }
}

const base = (i: ChargeInput) => ({
  amount: Math.round(i.amount * 100),
  currency: 'thb',
  description: i.description,
  metadata: { booking: i.bookingCode },
})

export const omise: Adapter = {
  // 3-D Secure: a pending charge comes back with authorize_uri; Omise sends the customer back
  // to return_uri afterwards and we read the charge again
  async card(i) {
    if (!i.token) throw new ProviderError('Missing card token')
    return toCharge(
      await call<OmiseCharge>('POST', '/charges', { ...base(i), card: i.token, return_uri: i.returnUri }),
    )
  },
  async promptpay(i) {
    const source = await call<{ id: string }>('POST', '/sources', {
      type: 'promptpay',
      amount: Math.round(i.amount * 100),
      currency: 'thb',
    })
    return toCharge(await call<OmiseCharge>('POST', '/charges', { ...base(i), source: source.id }))
  },
  async get(id) {
    if (!/^chrg_[A-Za-z0-9_]+$/.test(id)) throw new ProviderError('Not an Omise charge id')
    return toCharge(await call<OmiseCharge>('GET', `/charges/${id}`))
  },
}
