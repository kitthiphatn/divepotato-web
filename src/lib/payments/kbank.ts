// KBank K Payment Gateway (KPGW) adapter, Embedded UI. Server only: every call carries
// KBANK_SECRET_KEY as the `x-api-key` header. Card numbers never reach us: KBank's widget
// (kpayment.min.js, loaded from KBank's host) turns them into a one-time token and posts it to
// our card route, which charges it here. PromptPay: we create a QR order and the widget shows it.
//
//   POST /card/v2/charge          card token → charge (3-D Secure: Pre-Authorized + redirect_url)
//   GET  /card/v2/charge/{id}     card charge
//   POST /qr/v2/order             → order_test_… / order_prod_… for the widget's data-order-id
//   GET  /qr/v2/qr/{order_id}     QR payment of that order; "not paid yet" is an HTTP error (417)
//
// Paid means status "success" and transaction_state "Authorized" (cards that were settled since
// show Captured/Settled). Amounts are baht with two decimals at KBank, whole baht in our code.
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

import { ProviderError, type Adapter, type Charge, type ChargeInput } from './types'

const HOSTS = {
  sandbox: {
    api: 'https://dev-kpaymentgateway-services.kasikornbank.com',
    ui: 'https://dev-kpaymentgateway.kasikornbank.com',
  },
  production: {
    api: 'https://kpaymentgateway-services.kasikornbank.com',
    ui: 'https://kpaymentgateway.kasikornbank.com',
  },
}

// KBANK_ENV=production picks the live hosts; anything else is the sandbox
export const kbankHosts = () =>
  HOSTS[process.env.KBANK_ENV?.trim() === 'production' ? 'production' : 'sandbox']
export const kbankScript = () => `${kbankHosts().ui}/ui/v2/kpayment.min.js`
// Merchant id: required for cards (data-mid and additional_data.mid), not for QR
export const kbankMid = () => process.env.KBANK_MID?.trim() || ''

type KCharge = {
  id?: string
  object?: string
  order_id?: string | null
  amount?: number | string
  currency?: string
  status?: string
  transaction_state?: string | null
  reference_order?: string | null
  ref_1?: string | null
  failure_code?: string | null
  failure_message?: string | null
  redirect_url?: string | null
}

type KOrder = {
  id?: string
  status?: string
  expire_time_seconds?: number | string
  status_message?: string
  message?: string
}

async function call(method: 'GET' | 'POST', path: string, body?: Record<string, unknown>) {
  const key = process.env.KBANK_SECRET_KEY?.trim()
  if (!key) throw new ProviderError('KBANK_SECRET_KEY is not set')
  const res = await fetch(`${kbankHosts().api}${path}`, {
    method,
    headers: { 'x-api-key': key, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
    // Inquiries also run inside the webhook, which KBank wants answered within 10 s
    signal: AbortSignal.timeout(method === 'GET' ? 7_000 : 20_000),
  })
  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null
  return { status: res.status, ok: res.ok, json }
}

// Unique per attempt and letters/digits only: the booking/order code without dashes, an X, then
// time and randomness (DP-2611-0001 → DP26110001X…). Shows as the reference in KBank's portal.
export function referenceOrder(code: string) {
  const stamp = Date.now().toString(36).toUpperCase()
  return `${code.replace(/-/g, '')}X${stamp}${randomBytes(2).toString('hex').toUpperCase()}`
}

// The booking/order code back from a charge: ref_1 when KBank echoes it, else the reference
export function codeOf(c: { ref_1?: string | null; reference_order?: string | null }) {
  if (c.ref_1 && /^DP-[A-Z0-9-]+$/.test(c.ref_1)) return c.ref_1
  const m = /^DP(ORD)?(\d{4})(\d{4,6})X/.exec(c.reference_order ?? '')
  return m ? `DP-${m[1] ? 'ORD-' : ''}${m[2]}-${m[3]}` : null
}

const PAID_CARD = ['Authorized', 'Captured', 'Settled']

export function toCardCharge(c: KCharge): Charge {
  const status = String(c.status ?? '').toLowerCase()
  const state = c.transaction_state ?? ''
  return {
    id: String(c.id),
    status:
      status === 'success' && PAID_CARD.includes(state)
        ? 'succeeded'
        : status !== 'fail' && status !== 'failed' && ['Initialize', 'Pre-Authorized'].includes(state)
          ? 'pending'
          : 'failed',
    amount: Number(c.amount) || 0,
    currency: String(c.currency ?? '').toLowerCase(),
    code: codeOf(c),
    method: 'card',
    message: c.failure_message || c.failure_code || undefined,
    authorizeUri: c.redirect_url || undefined,
  }
}

// `id` is the order id we asked about (the payment's ref); KBank's own id is the QR charge's
export function toQrCharge(id: string, c: KCharge | null): Charge {
  const paid = c?.status === 'success' && c.transaction_state === 'Authorized'
  return {
    id,
    status: paid ? 'succeeded' : 'pending',
    amount: Number(c?.amount) || 0,
    currency: String(c?.currency ?? 'thb').toLowerCase(),
    code: c ? codeOf(c) : null,
    method: 'promptpay',
  }
}

const base = (i: ChargeInput) => ({
  amount: Number(i.amount.toFixed(2)),
  currency: 'THB',
  description: i.description.trim() || 'Dive Potato',
  reference_order: referenceOrder(i.code),
  ref_1: i.code,
})

export const kbank: Adapter = {
  // 3-D Secure: the charge comes back Pre-Authorized with redirect_url; KBank sends the customer
  // back to the Callback URL registered in its portal (/webhooks/kbank/return)
  async card(i) {
    if (!i.token || !/^tokn_[A-Za-z0-9_]+$/.test(i.token)) throw new ProviderError('Missing card token')
    const mid = kbankMid()
    if (!mid) throw new ProviderError('KBANK_MID is not set')
    const r = await call('POST', '/card/v2/charge', {
      ...base(i),
      source_type: 'card',
      mode: 'token',
      token: i.token,
      additional_data: { mid },
    })
    // A declined card can come back as an error status that still describes the charge
    const c = r.json as KCharge | null
    if (!c?.id || c.object !== 'charge')
      throw new ProviderError(`KBank /card/v2/charge: ${c?.failure_message ?? r.status}`)
    return toCardCharge(c)
  },
  async promptpay(i) {
    const r = await call('POST', '/qr/v2/order', { ...base(i), source_type: 'qr' })
    const o = r.json as KOrder | null
    if (!r.ok || o?.status !== 'success' || !o.id)
      throw new ProviderError(`KBank /qr/v2/order: ${o?.status_message ?? o?.message ?? r.status}`)
    const secs = Number(o.expire_time_seconds) || 900
    return {
      id: o.id,
      status: 'pending',
      amount: i.amount,
      currency: 'thb',
      code: i.code,
      method: 'promptpay',
      expiresAt: new Date(Date.now() + secs * 1000).toISOString(),
    }
  },
  async get(id) {
    if (/^order_[A-Za-z0-9_]+$/.test(id)) {
      // Before the QR is shown (no_transaction_found) and while it is unpaid (417
      // transaction_not_yet_paid) KBank answers with an error status: that is still pending
      const r = await call('GET', `/qr/v2/qr/${id}`).catch(() => null)
      return toQrCharge(id, r?.ok ? (r.json as KCharge | null) : null)
    }
    if (!/^chrg_[A-Za-z0-9_]+$/.test(id)) throw new ProviderError('Not a KBank charge or order id')
    const r = await call('GET', `/card/v2/charge/${id}`)
    const c = r.json as KCharge | null
    if (!r.ok || !c?.id) throw new ProviderError(`KBank /card/v2/charge/${id}: ${r.status}`)
    return toCardCharge(c)
  },
}

// Webhook checksum (KBank guideline, "How to generate checksum"; same for card and QR):
// sha256hex(id + amount with 4 decimals + currency + status + transaction_state + failure_code
// + secret key), failure_code empty when null. KBank's own Java sample joins a null
// failure_code as "null", so that form is accepted too.
export function kbankChecksum(body: Record<string, unknown>, secret: string, nullAs = '') {
  const amount = Number(body.amount)
  const input =
    String(body.id ?? '') +
    (Number.isFinite(amount) ? amount.toFixed(4) : '') +
    String(body.currency ?? '') +
    String(body.status ?? '') +
    String(body.transaction_state ?? '') +
    (body.failure_code == null ? nullAs : String(body.failure_code)) +
    secret
  return createHash('sha256').update(input).digest('hex')
}

export function verifyKbankChecksum(body: Record<string, unknown>, secret: string) {
  const claimed = typeof body.checksum === 'string' ? body.checksum.trim().toLowerCase() : ''
  if (!secret || !/^[0-9a-f]{64}$/.test(claimed)) return false
  const forms = [kbankChecksum(body, secret)]
  if (body.failure_code == null) forms.push(kbankChecksum(body, secret, 'null'))
  return forms.some((f) => timingSafeEqual(Buffer.from(f), Buffer.from(claimed)))
}
