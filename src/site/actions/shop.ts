'use server'

// Gear shop actions for the product, cart and checkout pages. The cart itself lives in the
// visitor's browser (localStorage); every price, stock figure and total here is read again from
// the database, so nothing the browser sends is trusted beyond "which variant, how many".
import config from '@payload-config'
import { getPayload, type BasePayload } from 'payload'

import { availableStock, expireStaleOrders, withStockLock } from '@/hooks/orders'
import { isLocale, type Locale } from '@/i18n/config'
import { mediaOf } from '@/lib/content'
import { payPath } from '@/lib/payments/link'
import { deliveryRules, shippingFee, type DeliveryRules } from '@/lib/shop'
import type { Product } from '@/payload-types'
import { clientIp, EMAIL, PHONE, rateLimiter, str } from '@/site/forms'
import { getDict } from '@/site/i18n'

export type CartInput = { variant: number; qty: number }[]

export type QuoteLine = {
  variant: number
  title: string
  size: string
  sku: string
  slug: string
  image: string | null
  price: number
  available: number
  // What the cart asked for, and what can be bought (never more than available)
  asked: number
  qty: number
  issue: 'gone' | 'soldout' | 'reduced' | null
}

export type Quote = {
  lines: QuoteLine[]
  subtotal: number
  rules: DeliveryRules
  holdMinutes: number
}

const MAX_LINES = 30
const MAX_QTY = 20

// At most MAX_LINES distinct variants with whole quantities, duplicates merged
function cleanCart(lines: unknown): CartInput {
  const out = new Map<number, number>()
  if (!Array.isArray(lines)) return []
  for (const l of lines.slice(0, MAX_LINES)) {
    const v = Number((l as { variant?: unknown })?.variant)
    const q = Math.floor(Number((l as { qty?: unknown })?.qty))
    if (Number.isInteger(v) && v > 0 && q > 0) out.set(v, Math.min(MAX_QTY, (out.get(v) ?? 0) + q))
  }
  return [...out].map(([variant, qty]) => ({ variant, qty }))
}

async function buildQuote(payload: BasePayload, locale: Locale, cart: CartInput): Promise<Quote> {
  const ids = cart.map((l) => l.variant)
  const [variants, left, settings] = await Promise.all([
    ids.length
      ? payload.find({
          collection: 'product-variants',
          where: { id: { in: ids } },
          pagination: false,
          depth: 0,
          overrideAccess: true,
        })
      : Promise.resolve({ docs: [] }),
    availableStock(payload, ids),
    payload.findGlobal({ slug: 'booking-settings', depth: 0, overrideAccess: true }),
  ])
  const productIds = [
    ...new Set(variants.docs.map((v) => (typeof v.product === 'object' ? v.product.id : v.product))),
  ]
  const products = productIds.length
    ? await payload.find({
        collection: 'products',
        where: { id: { in: productIds } },
        locale,
        pagination: false,
        depth: 1,
        overrideAccess: true,
      })
    : { docs: [] as Product[] }
  const vById = new Map(variants.docs.map((v) => [v.id, v]))
  const pById = new Map(products.docs.map((p) => [p.id, p]))

  const lines: QuoteLine[] = cart.map(({ variant, qty }) => {
    const v = vById.get(variant)
    const p = v ? pById.get(typeof v.product === 'object' ? v.product.id : v.product) : undefined
    if (!v || !p)
      return {
        variant,
        title: '',
        size: '',
        sku: '',
        slug: '',
        image: null,
        price: 0,
        available: 0,
        asked: qty,
        qty: 0,
        issue: 'gone',
      }
    const available = left.get(v.id) ?? 0
    const n = Math.min(qty, available)
    return {
      variant,
      title: p.title,
      size: v.size ?? '',
      sku: v.sku,
      slug: p.slug,
      image: mediaOf(p.images?.[0])?.url ?? null,
      price: v.price,
      available,
      asked: qty,
      qty: n,
      issue: available === 0 ? 'soldout' : n < qty ? 'reduced' : null,
    }
  })
  return {
    lines,
    subtotal: lines.reduce((s, l) => s + l.price * l.qty, 0),
    rules: deliveryRules(settings),
    holdMinutes: settings.holdMinutes ?? 15,
  }
}

// What can still be bought of each variant (stock minus open orders), for the product page
export async function stockAction(variantIds: number[]): Promise<Record<number, number>> {
  const ids = Array.isArray(variantIds) ? variantIds.slice(0, 50).map(Number) : []
  const payload = await getPayload({ config })
  return Object.fromEntries(await availableStock(payload, ids))
}

// Current prices and stock for the cart page and checkout summary
export async function quoteAction(locale: string, cart: CartInput): Promise<Quote> {
  const payload = await getPayload({ config })
  return buildQuote(payload, isLocale(locale) ? locale : 'th', cleanCart(cart))
}

export type CheckoutInput = {
  locale: string
  name: string
  phone: string
  email: string
  delivery: 'pickup' | 'ship'
  address: { line: string; district: string; province: string; postcode: string }
  cart: CartInput
  // The total the customer saw; the order is only placed when it still matches
  total: number
  // Honeypot
  website?: string
}

export type CheckoutResult =
  | { ok: true; payUrl: string }
  | { ok: false; error: string; field?: string; quote?: Quote }

// 10 orders per IP per 10 minutes
const limited = rateLimiter(10, 10 * 60_000)

// The customer who placed the order: the existing record with the same phone and name, or a new one
async function customerFor(payload: BasePayload, name: string, phone: string, email: string, locale: Locale) {
  const same = (a: string, b: string) => a.toLowerCase().replace(/\s+/g, ' ') === b.toLowerCase()
  const { docs } = await payload.find({
    collection: 'customers',
    where: { phone: { equals: phone } },
    limit: 20,
    depth: 0,
    overrideAccess: true,
  })
  const found = docs.find((c) => same(c.name, name))
  if (found) {
    if (email && !found.email)
      await payload.update({ collection: 'customers', id: found.id, data: { email }, overrideAccess: true })
    return found.id
  }
  const c = await payload.create({
    collection: 'customers',
    data: {
      name,
      phone,
      email: email || undefined,
      notes: `${locale === 'th' ? 'สั่งซื้อสินค้าผ่านเว็บไซต์' : 'Website shop order'} (${locale.toUpperCase()})`,
    },
    overrideAccess: true,
  })
  return c.id
}

// Place an order waiting for payment and return its pay link. Stock is checked and the order
// created under the stock lock, so the reserved quantities are counted before anyone else checks.
export async function placeOrderAction(input: CheckoutInput): Promise<CheckoutResult> {
  const locale: Locale = isLocale(input?.locale) ? input.locale : 'th'
  const e = getDict(locale).checkout.errors
  if (str(input?.website, 200)) return { ok: false, error: e.server }

  const name = str(input.name, 100)
  const phone = str(input.phone, 30)
  const email = str(input.email, 120).toLowerCase()
  const delivery = input.delivery === 'ship' ? 'ship' : input.delivery === 'pickup' ? 'pickup' : null
  const addr = {
    line: typeof input.address?.line === 'string' ? input.address.line.trim().slice(0, 300) : '',
    district: str(input.address?.district, 80),
    province: str(input.address?.province, 80),
    postcode: str(input.address?.postcode, 10),
  }
  const cart = cleanCart(input.cart)

  if (name.length < 2) return { ok: false, error: e.name, field: 'name' }
  if (!PHONE.test(phone)) return { ok: false, error: e.phone, field: 'phone' }
  if (email && !EMAIL.test(email)) return { ok: false, error: e.email, field: 'email' }
  if (!delivery) return { ok: false, error: e.delivery, field: 'delivery' }
  if (delivery === 'ship') {
    if (addr.line.length < 5) return { ok: false, error: e.address, field: 'line' }
    if (!addr.district) return { ok: false, error: e.address, field: 'district' }
    if (!addr.province) return { ok: false, error: e.address, field: 'province' }
    if (!/^\d{5}$/.test(addr.postcode)) return { ok: false, error: e.postcode, field: 'postcode' }
  }
  if (!cart.length) return { ok: false, error: e.empty }
  if (limited(await clientIp())) return { ok: false, error: e.rate }

  try {
    const payload = await getPayload({ config })
    await expireStaleOrders(payload)
    return await withStockLock(async (): Promise<CheckoutResult> => {
      const quote = await buildQuote(payload, locale, cart)
      if (!(delivery === 'ship' ? quote.rules.ship : quote.rules.pickup))
        return { ok: false, error: e.delivery, field: 'delivery', quote }
      if (quote.lines.some((l) => l.issue)) return { ok: false, error: e.stock, quote }
      const fee = shippingFee(quote.subtotal, delivery, quote.rules)
      if (Math.round(Number(input.total)) !== quote.subtotal + fee)
        return { ok: false, error: e.changed, quote }

      const customer = await customerFor(payload, name, phone, email, locale)
      const order = await payload.create({
        collection: 'orders',
        data: {
          status: 'pending_payment',
          customer,
          delivery,
          address: delivery === 'ship' ? addr : undefined,
          shippingFee: fee,
          items: quote.lines.map((l) => ({
            variant: l.variant,
            title: l.title,
            size: l.size || undefined,
            sku: l.sku,
            unitPrice: l.price,
            qty: l.qty,
          })),
          timeline: [
            {
              at: new Date().toISOString(),
              event: 'website order',
              note: email ? `${phone} · ${email}` : phone,
            },
          ],
        },
        overrideAccess: true,
      })
      if (!order.code || !order.payToken) return { ok: false, error: e.server }
      return { ok: true, payUrl: payPath(locale, order.code, order.payToken) }
    })
  } catch (err) {
    console.error('Shop order failed', err)
    return { ok: false, error: e.server }
  }
}
