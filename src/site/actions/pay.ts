'use server'

// Pay page actions, for a booking's deposit or a shop order's full amount. Every call carries the
// booking/order code and the pay-link token; the booking must still be on hold, the order still
// waiting for payment. Card and QR results are always read back from the provider (see
// lib/payments/confirm), never taken from the browser.
import config from '@payload-config'
import { randomBytes } from 'node:crypto'
import { getPayload, type BasePayload } from 'payload'

import { expireStaleHolds } from '@/hooks/bookings'
import { expireStaleOrders } from '@/hooks/orders'
import { isLocale, type Locale } from '@/i18n/config'
import { adapterFor, getPayConfig, type PayConfig } from '@/lib/payments/config'
import { reconcilePayment, withEvents } from '@/lib/payments/confirm'
import { simulateDemoPaid } from '@/lib/payments/demo'
import { bookingFromLink, isOrderCode, orderFromLink, payPath } from '@/lib/payments/link'
import { checkSlip } from '@/lib/payments/slip'
import type { Booking, Customer, Order, Payment } from '@/payload-types'
import { getDict } from '@/site/i18n'
import { siteUrl } from '@/site/seo'

export type PayResult =
  | {
      ok: true
      status: 'pending' | 'succeeded' | 'failed' | 'rejected'
      paymentId?: number
      // Omise 3-D Secure page
      redirect?: string
      // Stripe card: confirm in the browser with Stripe.js
      clientSecret?: string
      qrImage?: string
      expiresAt?: string
      message?: string
    }
  | { ok: false; error: string }

type Link = { locale: string; code: string; token: string }

const relId = (v: number | { id: number } | null | undefined) =>
  v && typeof v === 'object' ? v.id : (v ?? null)

// What the link pays for: a booking's deposit or a shop order's total
type Payable = {
  owner: { booking: number } | { order: number }
  code: string
  amount: number
  kind: 'deposit' | 'full'
  customer: number
  booking?: Booking
  order?: Order
}

const payableOf = (b: Booking | null, o: Order | null): Payable | null =>
  b
    ? {
        owner: { booking: b.id },
        code: b.code!,
        amount: b.deposit ?? 0,
        kind: 'deposit',
        customer: relId(b.customer)!,
        booking: b,
      }
    : o
      ? {
          owner: { order: o.id },
          code: o.code!,
          amount: o.total ?? 0,
          kind: 'full',
          customer: relId(o.customer)!,
          order: o,
        }
      : null

// The booking or order behind a link, whatever its status
async function fromLink(payload: BasePayload, code: string, token: string) {
  return isOrderCode(code)
    ? payableOf(null, await orderFromLink(payload, code, token))
    : payableOf(await bookingFromLink(payload, code, token), null)
}

const belongs = (p: Payment, x: Payable) =>
  'order' in x.owner ? relId(p.order) === x.owner.order : relId(p.booking) === x.owner.booking

// The booking (still on hold) or order (still waiting for payment) behind the link, inside its
// hold time
async function open(link: Link): Promise<
  | { ok: true; payload: BasePayload; x: Payable; cfg: PayConfig; locale: Locale }
  | { ok: false; error: string }
> {
  const locale: Locale = isLocale(link.locale) ? link.locale : 'th'
  const t = getDict(locale).pay
  const payload = await getPayload({ config })
  const code = String(link.code)
  const token = String(link.token)
  let x = await fromLink(payload, code, token)
  if (!x) return { ok: false, error: t.error }
  const late = (at?: string | null) => Boolean(at && Date.parse(at) <= Date.now())
  if (x.booking?.status === 'hold' && late(x.booking.holdExpiresAt)) {
    await expireStaleHolds(payload, relId(x.booking.departure)!)
    x = await fromLink(payload, code, token)
  } else if (x.order?.status === 'pending_payment' && late(x.order.holdExpiresAt)) {
    await expireStaleOrders(payload)
    x = await fromLink(payload, code, token)
  }
  if (!x) return { ok: false, error: t.error }
  const waiting = x.booking ? x.booking.status === 'hold' : x.order?.status === 'pending_payment'
  if (!waiting) return { ok: false, error: x.order ? getDict(locale).order.expiredT : t.expiredT }
  if (!(x.amount > 0)) return { ok: false, error: t.error }
  return { ok: true, payload, x, cfg: await getPayConfig(payload), locale }
}

const fail = (locale: string, err: unknown, what: string) => {
  console.error(`Pay ${what} failed`, err)
  return { ok: false as const, error: getDict(isLocale(locale) ? locale : 'th').pay.error }
}

const description = (x: Payable) =>
  `Dive Potato ${x.code} ${x.kind === 'full' ? 'shop order' : 'deposit'}`

// A new pending payment record for the booking/order
const newPayment = (x: Payable, data: Omit<Payment, 'id' | 'updatedAt' | 'createdAt' | 'kind' | 'amount'>) => ({
  ...x.owner,
  kind: x.kind,
  amount: x.amount,
  ...data,
})

export async function payCardAction(input: Link & { cardToken?: string }): Promise<PayResult> {
  const o = await open(input)
  if (!o.ok) return o
  const { payload, x, cfg } = o
  if (!cfg.methods.includes('card')) return { ok: false, error: getDict(o.locale).pay.error }
  try {
    const charge = await adapterFor(cfg.provider).card({
      amount: x.amount,
      code: x.code,
      description: description(x),
      token: input.cardToken,
      returnUri: `${siteUrl()}${payPath(o.locale, x.code, String(input.token))}`,
    })
    const p = await payload.create({
      collection: 'payments',
      data: newPayment(x, { provider: cfg.provider, method: 'card', status: 'pending', ref: charge.id }),
      overrideAccess: true,
    })
    if (charge.clientSecret && cfg.provider === 'stripe')
      return { ok: true, status: 'pending', paymentId: p.id, clientSecret: charge.clientSecret }
    const status = await reconcilePayment(payload, p.id, charge)
    if (status === 'pending' && charge.authorizeUri)
      return { ok: true, status, paymentId: p.id, redirect: charge.authorizeUri }
    return { ok: true, status, paymentId: p.id, message: charge.message }
  } catch (err) {
    return fail(o.locale, err, 'card')
  }
}

export async function payQrAction(input: Link): Promise<PayResult> {
  const o = await open(input)
  if (!o.ok) return o
  const { payload, x, cfg } = o
  if (!cfg.methods.includes('promptpay')) return { ok: false, error: getDict(o.locale).pay.error }
  try {
    // Stripe needs an email on PromptPay payments: the customer's, else the shop's
    let email: string | undefined
    if (cfg.provider === 'stripe') {
      const c = (await payload.findByID({
        collection: 'customers',
        id: x.customer,
        depth: 0,
        overrideAccess: true,
      })) as Customer
      const site = await payload.findGlobal({ slug: 'site-settings', depth: 0, overrideAccess: true })
      email = c.email || site.contact?.email || undefined
    }
    const charge = await adapterFor(cfg.provider).promptpay({
      amount: x.amount,
      code: x.code,
      description: description(x),
      email,
    })
    const p = await payload.create({
      collection: 'payments',
      data: newPayment(x, { provider: cfg.provider, method: 'promptpay', status: 'pending', ref: charge.id }),
      overrideAccess: true,
    })
    const status = await reconcilePayment(payload, p.id, charge)
    return {
      ok: true,
      status,
      paymentId: p.id,
      qrImage: charge.qrImage,
      expiresAt: charge.expiresAt,
      message: charge.message,
    }
  } catch (err) {
    return fail(o.locale, err, 'QR')
  }
}

// Polled by the page while a QR is shown, and called after Stripe.js confirms a card
export async function checkPaymentAction(input: Link & { paymentId: number }): Promise<PayResult> {
  const locale = isLocale(input.locale) ? input.locale : 'th'
  try {
    const payload = await getPayload({ config })
    const x = await fromLink(payload, String(input.code), String(input.token))
    if (!x) return { ok: false, error: getDict(locale).pay.error }
    const p = await payload
      .findByID({ collection: 'payments', id: Number(input.paymentId), depth: 0, overrideAccess: true })
      .catch(() => null)
    if (!p || !belongs(p, x)) return { ok: false, error: getDict(locale).pay.error }
    const status = await reconcilePayment(payload, p.id)
    return { ok: true, status, paymentId: p.id }
  } catch (err) {
    return fail(locale, err, 'check')
  }
}

// Demo provider only: the "simulate payment" button under the sample QR
export async function simulateDemoAction(input: Link & { paymentId: number }): Promise<PayResult> {
  const locale = isLocale(input.locale) ? input.locale : 'th'
  const payload = await getPayload({ config })
  const x = await fromLink(payload, String(input.code), String(input.token))
  const p = x
    ? await payload
        .findByID({ collection: 'payments', id: Number(input.paymentId), depth: 0, overrideAccess: true })
        .catch(() => null)
    : null
  if (!x || !p || !belongs(p, x) || p.provider !== 'demo' || !p.ref)
    return { ok: false, error: getDict(locale).pay.error }
  simulateDemoPaid(p.ref)
  return { ok: true, status: await reconcilePayment(payload, p.id), paymentId: p.id }
}

const MAX_SLIP = 5 * 1024 * 1024
const SLIP_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heic',
}

// What the file's first bytes say it is (the browser's type can be wrong or missing)
function sniff(b: Buffer): string | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return 'image/png'
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP')
    return 'image/webp'
  if (b.toString('ascii', 4, 8) === 'ftyp' && /^(heic|heix|hevc|mif1|msf1)/.test(b.toString('ascii', 8, 12)))
    return 'image/heic'
  return null
}

// Bank transfer: save the slip, read its QR (see lib/payments/slip), record a pending payment
// and hand the booking or order to staff (pending_review keeps its seats or stock until they
// approve or reject the slip). Never approved automatically, whatever the QR check says.
export async function uploadSlipAction(form: FormData): Promise<PayResult> {
  const link = {
    locale: String(form.get('locale') ?? ''),
    code: String(form.get('code') ?? ''),
    token: String(form.get('token') ?? ''),
  }
  const o = await open(link)
  if (!o.ok) return o
  const t = getDict(o.locale).pay
  const { payload, x, cfg } = o
  if (!cfg.methods.includes('transfer')) return { ok: false, error: t.error }
  const file = form.get('slip')
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_SLIP)
    return { ok: false, error: t.slipBad }
  const data = Buffer.from(await file.arrayBuffer())
  const type = sniff(data)
  if (!type) return { ok: false, error: t.slipBad }
  try {
    const check = await checkSlip(payload, data)
    // Random file name so slips can't be found by guessing
    const name = `slip-${x.code}-${randomBytes(8).toString('hex')}.${SLIP_TYPES[type]}`
    const media = await payload.create({
      collection: 'media',
      data: { alt: `Slip ${x.code}` },
      file: { data, mimetype: type, name, size: data.length },
      overrideAccess: true,
    })
    await payload.create({
      collection: 'payments',
      data: newPayment(x, {
        provider: 'slip',
        method: 'transfer',
        status: 'pending',
        slip: media.id,
        slipRef: check.slipRef,
        slipCheck: check.slipCheck,
      }),
      overrideAccess: true,
    })
    const events = [{ event: 'slip uploaded', note: check.slipCheck === 'ok' ? undefined : check.slipCheck }]
    if (x.order)
      await payload.update({
        collection: 'orders',
        id: x.order.id,
        data: { status: 'pending_review', timeline: withEvents(x.order, events) },
        overrideAccess: true,
      })
    else if (x.booking)
      await payload.update({
        collection: 'bookings',
        id: x.booking.id,
        data: { status: 'pending_review', timeline: withEvents(x.booking, events) },
        overrideAccess: true,
      })
    return { ok: true, status: 'pending' }
  } catch (err) {
    return fail(o.locale, err, 'slip')
  }
}
