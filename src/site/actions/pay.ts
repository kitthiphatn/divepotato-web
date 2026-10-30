'use server'

// Pay page actions. Every call carries the booking code and the pay-link token; the booking must
// still be on hold. Card and QR results are always read back from the provider (see
// lib/payments/confirm), never taken from the browser.
import config from '@payload-config'
import { randomBytes } from 'node:crypto'
import { getPayload, type BasePayload } from 'payload'

import { expireStaleHolds } from '@/hooks/bookings'
import { isLocale, type Locale } from '@/i18n/config'
import { adapterFor, getPayConfig, type PayConfig } from '@/lib/payments/config'
import { reconcilePayment, withEvents } from '@/lib/payments/confirm'
import { simulateDemoPaid } from '@/lib/payments/demo'
import { bookingFromLink, payPath } from '@/lib/payments/link'
import { checkSlip } from '@/lib/payments/slip'
import type { Booking, Customer } from '@/payload-types'
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

const relId = (v: number | { id: number }) => (typeof v === 'object' ? v.id : v)

// The booking behind the link, still on hold and inside its hold time
async function open(link: Link): Promise<
  | { ok: true; payload: BasePayload; booking: Booking; cfg: PayConfig; locale: Locale }
  | { ok: false; error: string }
> {
  const locale: Locale = isLocale(link.locale) ? link.locale : 'th'
  const t = getDict(locale).pay
  const payload = await getPayload({ config })
  let booking = await bookingFromLink(payload, String(link.code), String(link.token))
  if (!booking) return { ok: false, error: t.error }
  if (booking.status === 'hold' && booking.holdExpiresAt && Date.parse(booking.holdExpiresAt) <= Date.now()) {
    await expireStaleHolds(payload, relId(booking.departure))
    booking = await payload.findByID({ collection: 'bookings', id: booking.id, depth: 0, overrideAccess: true })
  }
  if (booking.status !== 'hold') return { ok: false, error: t.expiredT }
  if (!(booking.deposit && booking.deposit > 0)) return { ok: false, error: t.error }
  return { ok: true, payload, booking, cfg: await getPayConfig(payload), locale }
}

const fail = (locale: string, err: unknown, what: string) => {
  console.error(`Pay ${what} failed`, err)
  return { ok: false as const, error: getDict(isLocale(locale) ? locale : 'th').pay.error }
}

const description = (b: Booking) => `Dive Potato ${b.code} deposit`

export async function payCardAction(input: Link & { cardToken?: string }): Promise<PayResult> {
  const o = await open(input)
  if (!o.ok) return o
  const { payload, booking, cfg } = o
  if (!cfg.methods.includes('card')) return { ok: false, error: getDict(o.locale).pay.error }
  try {
    const charge = await adapterFor(cfg.provider).card({
      amount: booking.deposit!,
      bookingCode: booking.code!,
      description: description(booking),
      token: input.cardToken,
      returnUri: `${siteUrl()}${payPath(o.locale, booking.code!, String(input.token))}`,
    })
    const p = await payload.create({
      collection: 'payments',
      data: {
        booking: booking.id,
        provider: cfg.provider,
        method: 'card',
        kind: 'deposit',
        amount: booking.deposit!,
        status: 'pending',
        ref: charge.id,
      },
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
  const { payload, booking, cfg } = o
  if (!cfg.methods.includes('promptpay')) return { ok: false, error: getDict(o.locale).pay.error }
  try {
    // Stripe needs an email on PromptPay payments: the customer's, else the shop's
    let email: string | undefined
    if (cfg.provider === 'stripe') {
      const c = (await payload.findByID({
        collection: 'customers',
        id: relId(booking.customer),
        depth: 0,
        overrideAccess: true,
      })) as Customer
      const site = await payload.findGlobal({ slug: 'site-settings', depth: 0, overrideAccess: true })
      email = c.email || site.contact?.email || undefined
    }
    const charge = await adapterFor(cfg.provider).promptpay({
      amount: booking.deposit!,
      bookingCode: booking.code!,
      description: description(booking),
      email,
    })
    const p = await payload.create({
      collection: 'payments',
      data: {
        booking: booking.id,
        provider: cfg.provider,
        method: 'promptpay',
        kind: 'deposit',
        amount: booking.deposit!,
        status: 'pending',
        ref: charge.id,
      },
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
    const booking = await bookingFromLink(payload, String(input.code), String(input.token))
    if (!booking) return { ok: false, error: getDict(locale).pay.error }
    const p = await payload
      .findByID({ collection: 'payments', id: Number(input.paymentId), depth: 0, overrideAccess: true })
      .catch(() => null)
    if (!p || relId(p.booking) !== booking.id) return { ok: false, error: getDict(locale).pay.error }
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
  const booking = await bookingFromLink(payload, String(input.code), String(input.token))
  const p = booking
    ? await payload
        .findByID({ collection: 'payments', id: Number(input.paymentId), depth: 0, overrideAccess: true })
        .catch(() => null)
    : null
  if (!booking || !p || relId(p.booking) !== booking.id || p.provider !== 'demo' || !p.ref)
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
// and hand the booking to staff (pending_review keeps its seats until they approve or reject the
// slip). Never approved automatically, whatever the QR check says.
export async function uploadSlipAction(form: FormData): Promise<PayResult> {
  const link = {
    locale: String(form.get('locale') ?? ''),
    code: String(form.get('code') ?? ''),
    token: String(form.get('token') ?? ''),
  }
  const o = await open(link)
  if (!o.ok) return o
  const t = getDict(o.locale).pay
  const { payload, booking, cfg } = o
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
    const name = `slip-${booking.code}-${randomBytes(8).toString('hex')}.${SLIP_TYPES[type]}`
    const media = await payload.create({
      collection: 'media',
      data: { alt: `Slip ${booking.code}` },
      file: { data, mimetype: type, name, size: data.length },
      overrideAccess: true,
    })
    await payload.create({
      collection: 'payments',
      data: {
        booking: booking.id,
        provider: 'slip',
        method: 'transfer',
        kind: 'deposit',
        amount: booking.deposit!,
        status: 'pending',
        slip: media.id,
        slipRef: check.slipRef,
        slipCheck: check.slipCheck,
      },
      overrideAccess: true,
    })
    await payload.update({
      collection: 'bookings',
      id: booking.id,
      data: {
        status: 'pending_review',
        timeline: withEvents(booking, [
          { event: 'slip uploaded', note: check.slipCheck === 'ok' ? undefined : check.slipCheck },
        ]),
      },
      overrideAccess: true,
    })
    return { ok: true, status: 'pending' }
  } catch (err) {
    return fail(o.locale, err, 'slip')
  }
}
