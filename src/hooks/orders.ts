import { randomBytes } from 'node:crypto'

import type { BasePayload, CollectionBeforeChangeHook, PayloadRequest } from 'payload'

import type { Order } from '../payload-types'

import { relId } from './bookings'

// Stock is reserved (not yet taken) while an order waits for payment or slip review, taken off
// the variants for good once it is paid, and put back when a paid order is cancelled before it
// leaves the shop. An order that already went out (shipped / picked up) keeps its stock taken.
export const RESERVE_STATUSES = ['pending_payment', 'pending_review'] as const
export const TAKEN_STATUSES = ['paid', 'packed', 'shipped', 'picked_up'] as const
const RELEASE_STATUSES = ['cancelled', 'refunded', 'expired']
const GONE_STATUSES = ['shipped', 'picked_up']

const is = (list: readonly string[], v: unknown) => typeof v === 'string' && list.includes(v)

type Items = NonNullable<Order['items']>

// DP-ORD-YYMM-NNNN, numbered per month
async function nextCode(req: PayloadRequest) {
  const now = new Date()
  const prefix = `DP-ORD-${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}-`
  const last = await req.payload.find({
    collection: 'orders',
    where: { code: { like: prefix } },
    sort: '-code',
    limit: 1,
    depth: 0,
    req,
    overrideAccess: true,
  })
  const n = last.docs[0] ? Number(last.docs[0].code?.slice(prefix.length)) || 0 : 0
  return `${prefix}${String(n + 1).padStart(4, '0')}`
}

// Add (+1) or take (-1) the order's quantities on the variants' stock. Never below zero: staff
// may have corrected the count by hand in the meantime.
async function moveStock(req: PayloadRequest, items: Items, sign: 1 | -1) {
  for (const it of items) {
    const id = relId(it.variant)
    if (!id || !it.qty) continue
    const v = await req.payload
      .findByID({ collection: 'product-variants', id, depth: 0, req, overrideAccess: true })
      .catch(() => null)
    if (!v) continue
    await req.payload.update({
      collection: 'product-variants',
      id,
      data: { stock: Math.max(0, (v.stock ?? 0) + sign * it.qty) },
      req,
      overrideAccess: true,
    })
  }
}

// Code, pay-link token, line totals, hold expiry, stock movements and timeline. Unit prices are
// snapshots taken at checkout; the total is always the items plus the shipping fee.
export const prepareOrder: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  const next = { ...data }
  if (operation === 'create' && !next.code) next.code = await nextCode(req)
  if (operation === 'create' && !next.payToken) next.payToken = randomBytes(18).toString('base64url')

  const items: Items = (next.items ?? originalDoc?.items ?? []).map((it: Items[number]) => ({
    ...it,
    lineTotal: Math.round((it.unitPrice ?? 0) * (it.qty ?? 0)),
  }))
  next.items = items
  next.subtotal = items.reduce((s, it) => s + (it.lineTotal ?? 0), 0)
  const fee = Math.max(0, Math.round(Number(next.shippingFee ?? originalDoc?.shippingFee ?? 0)))
  next.shippingFee = fee
  next.total = next.subtotal + fee

  const status = next.status ?? originalDoc?.status ?? 'pending_payment'
  const was = operation === 'update' ? originalDoc?.status : null
  if (status !== 'pending_payment' && status !== 'expired') {
    next.holdExpiresAt = null
  } else if (status === 'pending_payment' && !(next.holdExpiresAt ?? originalDoc?.holdExpiresAt)) {
    const settings = await req.payload.findGlobal({
      slug: 'booking-settings',
      req,
      overrideAccess: true,
      depth: 0,
    })
    next.holdExpiresAt = new Date(Date.now() + (settings.holdMinutes ?? 15) * 60_000).toISOString()
  }

  const deducted = Boolean(next.stockDeducted ?? originalDoc?.stockDeducted)
  if (is(TAKEN_STATUSES, status) && !deducted) {
    await moveStock(req, items, -1)
    next.stockDeducted = true
  } else if (is(RELEASE_STATUSES, status) && deducted && !is(GONE_STATUSES, was)) {
    await moveStock(req, items, 1)
    next.stockDeducted = false
  }

  const timeline = Array.isArray(next.timeline)
    ? [...next.timeline]
    : [...(originalDoc?.timeline ?? [])]
  const at = new Date().toISOString()
  const by = req.user?.id ?? null
  if (operation === 'create' && timeline.length === 0) {
    timeline.push({ at, event: `created (${status})`, by })
  } else if (was && next.status && next.status !== was) {
    timeline.push({ at, event: `status: ${was} → ${next.status}`, by })
  }
  next.timeline = timeline
  return next
}

// Quantities per variant held by orders still waiting for payment or slip review (an unpaid
// order past its hold time no longer counts, even before it is marked expired)
export async function reservedStock(payload: BasePayload, exceptOrderId?: number) {
  const { docs } = await payload.find({
    collection: 'orders',
    where: { status: { in: [...RESERVE_STATUSES] } },
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  const now = Date.now()
  const held = new Map<number, number>()
  for (const o of docs) {
    if (o.id === exceptOrderId) continue
    if (o.status === 'pending_payment' && o.holdExpiresAt && Date.parse(o.holdExpiresAt) <= now)
      continue
    for (const it of o.items ?? []) {
      const id = relId(it.variant)
      if (id) held.set(id, (held.get(id) ?? 0) + (it.qty ?? 0))
    }
  }
  return held
}

// What can still be bought of each variant: stock minus what open orders hold
export async function availableStock(
  payload: BasePayload,
  variantIds: number[],
  exceptOrderId?: number,
) {
  const ids = [...new Set(variantIds.filter((x) => Number.isInteger(x) && x > 0))]
  const out = new Map<number, number>()
  if (!ids.length) return out
  const [variants, held] = await Promise.all([
    payload.find({
      collection: 'product-variants',
      where: { id: { in: ids } },
      pagination: false,
      depth: 0,
      overrideAccess: true,
    }),
    reservedStock(payload, exceptOrderId),
  ])
  for (const v of variants.docs) out.set(v.id, Math.max(0, (v.stock ?? 0) - (held.get(v.id) ?? 0)))
  return out
}

// Checking stock and creating the order happen one at a time (the site runs as a single Node
// process), so two people can't both buy the last item
const g = globalThis as unknown as { __stockLock?: Promise<unknown> }
export async function withStockLock<T>(fn: () => Promise<T>): Promise<T> {
  const prev = g.__stockLock ?? Promise.resolve()
  const run = prev.catch(() => null).then(fn)
  g.__stockLock = run.catch(() => null)
  return run
}

// Mark unpaid orders whose hold has run out as `expired`. Like expireStaleHolds for bookings,
// there is no background job: this runs at checkout, on the pay page and in the backoffice.
export async function expireStaleOrders(payload: BasePayload) {
  const { docs } = await payload.find({
    collection: 'orders',
    where: {
      and: [
        { status: { equals: 'pending_payment' } },
        { holdExpiresAt: { less_than: new Date().toISOString() } },
      ],
    },
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  for (const o of docs) {
    try {
      await payload.update({
        collection: 'orders',
        id: o.id,
        data: { status: 'expired' },
        overrideAccess: true,
      })
    } catch (err) {
      payload.logger.error({ err }, `Could not expire order ${o.code}`)
    }
  }
  return docs.length
}
