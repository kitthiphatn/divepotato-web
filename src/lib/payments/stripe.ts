// Stripe REST adapter (https://docs.stripe.com/api/payment_intents). Server only: uses
// STRIPE_SECRET_KEY as a bearer token with form-encoded bodies. Cards are entered in Stripe.js's
// own card field and confirmed in the browser with the client secret (3-D Secure included).
import { ProviderError, type Adapter, type Charge, type ChargeInput } from './types'

const API = 'https://api.stripe.com/v1'

type Intent = {
  object: 'payment_intent'
  id: string
  status:
    | 'requires_payment_method'
    | 'requires_confirmation'
    | 'requires_action'
    | 'processing'
    | 'requires_capture'
    | 'canceled'
    | 'succeeded'
  amount: number
  amount_received?: number
  currency: string
  client_secret?: string | null
  metadata?: Record<string, string> | null
  payment_method_types?: string[]
  last_payment_error?: { message?: string } | null
  next_action?: {
    promptpay_display_qr_code?: {
      image_url_png?: string
      expires_at?: number
    } | null
  } | null
}

async function call(method: 'GET' | 'POST', path: string, body?: URLSearchParams) {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new ProviderError('STRIPE_SECRET_KEY is not set')
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body,
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
  })
  const json = (await res.json().catch(() => null)) as
    | (Intent & { error?: { message?: string } })
    | null
  if (!res.ok || !json || json.error)
    throw new ProviderError(`Stripe ${path}: ${json?.error?.message ?? res.status}`)
  return json
}

function toCharge(p: Intent): Charge {
  const qr = p.payment_method_types?.includes('promptpay') ?? false
  const display = p.next_action?.promptpay_display_qr_code
  // A new card intent also waits in requires_payment_method; it only failed once an attempt
  // left an error behind
  const failed =
    p.status === 'canceled' || (p.status === 'requires_payment_method' && !!p.last_payment_error)
  return {
    id: p.id,
    status: p.status === 'succeeded' ? 'succeeded' : failed ? 'failed' : 'pending',
    amount: (p.status === 'succeeded' ? (p.amount_received ?? p.amount) : p.amount) / 100,
    currency: p.currency.toLowerCase(),
    bookingCode: p.metadata?.booking ?? null,
    method: qr ? 'promptpay' : 'card',
    message: p.last_payment_error?.message,
    clientSecret: p.client_secret ?? undefined,
    qrImage: display?.image_url_png,
    expiresAt: display?.expires_at ? new Date(display.expires_at * 1000).toISOString() : undefined,
  }
}

const base = (i: ChargeInput, type: 'card' | 'promptpay') =>
  new URLSearchParams({
    amount: String(Math.round(i.amount * 100)),
    currency: 'thb',
    description: i.description,
    'metadata[booking]': i.bookingCode,
    'payment_method_types[]': type,
  })

export const stripe: Adapter = {
  async card(i) {
    return toCharge(await call('POST', '/payment_intents', base(i, 'card')))
  },
  // Confirmed here on the server so the response already carries the QR to show
  async promptpay(i) {
    const body = base(i, 'promptpay')
    body.set('payment_method_data[type]', 'promptpay')
    // Stripe requires an email on PromptPay payments
    if (i.email) body.set('payment_method_data[billing_details][email]', i.email)
    body.set('confirm', 'true')
    return toCharge(await call('POST', '/payment_intents', body))
  },
  async get(id) {
    if (!/^pi_[A-Za-z0-9_]+$/.test(id)) throw new ProviderError('Not a Stripe PaymentIntent id')
    return toCharge(await call('GET', `/payment_intents/${id}`))
  },
}
