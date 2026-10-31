// Confirms online payments. Whatever triggers it (the pay page polling, the customer coming back
// from 3-D Secure, a provider webhook), a payment only counts as paid after we read the charge
// back from the provider with our secret key; nothing the browser or a webhook body says is
// trusted. Running it again for the same charge changes nothing.
import type { BasePayload, Where } from 'payload'

import { countSeats, relId } from '@/hooks/bookings'
import { availableStock, withStockLock } from '@/hooks/orders'
import type { Booking, Order, Payment } from '@/payload-types'
import { formatTHB } from '@/lib/dates'

import { adapterFor, isProvider } from './config'
import { isOrderCode } from './link'
import type { Charge, ProviderId } from './types'

type Event = { event: string; note?: string }

// The booking's or order's timeline plus new events (their hooks add status changes themselves)
export function withEvents(b: Pick<Booking, 'timeline'> | Pick<Order, 'timeline'>, events: Event[]) {
  const at = new Date().toISOString()
  return [
    ...(b.timeline ?? []).map((t) => ({
      id: t.id,
      at: t.at,
      event: t.event,
      note: t.note,
      by: typeof t.by === 'object' && t.by ? t.by.id : t.by,
    })),
    ...events.map((e) => ({ at, event: e.event, note: e.note?.slice(0, 500) || undefined })),
  ]
}

// One confirmation at a time per payment, so a webhook and the page's polling arriving
// together can't both apply the same charge (the site runs as a single Node process)
const g = globalThis as unknown as { __payLocks?: Map<number, Promise<unknown>> }
const locks = (g.__payLocks ??= new Map())
async function locked<T>(id: number, fn: () => Promise<T>): Promise<T> {
  while (locks.has(id)) await locks.get(id)!.catch(() => null)
  const p = fn()
  locks.set(id, p)
  try {
    return await p
  } finally {
    locks.delete(id)
  }
}

const ONLINE: Payment['provider'][] = ['omise', 'stripe', 'demo']
const label = (p: Payment) => `${p.provider} ${p.method ?? ''}`.trim()

// Re-read one pending online payment from its provider and apply the result. Returns the
// payment's status afterwards.
export async function reconcilePayment(
  payload: BasePayload,
  paymentId: number,
  known?: Charge,
): Promise<Payment['status']> {
  return locked(paymentId, async () => {
    const p = await payload.findByID({
      collection: 'payments',
      id: paymentId,
      depth: 0,
      overrideAccess: true,
    })
    if (p.status !== 'pending' || !ONLINE.includes(p.provider) || !p.ref) return p.status
    if (!isProvider(p.provider)) return p.status
    const charge = known ?? (await adapterFor(p.provider).get(p.ref))
    if (charge.id !== p.ref || charge.status === 'pending') return p.status

    const target = await targetOf(payload, p)
    if (!target) return p.status
    const note = (events: Event[]) => addEvents(payload, target, events)

    if (charge.status === 'failed') {
      await payload.update({
        collection: 'payments',
        id: p.id,
        data: { status: 'failed' },
        overrideAccess: true,
      })
      await note([
        { event: 'payment failed', note: [label(p), charge.message].filter(Boolean).join(' · ') },
      ])
      return 'failed'
    }

    // Paid at the provider. Only count it when it is the charge we created for this booking/order.
    const matches =
      charge.currency === 'thb' &&
      Math.round(charge.amount) === Math.round(p.amount) &&
      (!charge.code || charge.code === target.doc.code)
    if (!matches) {
      await note([
        {
          event: 'payment mismatch',
          note: `${label(p)} ${p.ref}: ${charge.amount} ${charge.currency} / ${charge.code ?? '-'}`,
        },
      ])
      return p.status
    }

    await payload.update({
      collection: 'payments',
      id: p.id,
      data: { status: 'succeeded' },
      overrideAccess: true,
    })
    if (target.kind === 'order') await applyOrderPaid(payload, target.doc, p)
    else await applyPaid(payload, target.doc, p)
    return 'succeeded'
  })
}

type Target = { kind: 'booking'; doc: Booking } | { kind: 'order'; doc: Order }

// The booking or shop order a payment belongs to
async function targetOf(payload: BasePayload, p: Payment): Promise<Target | null> {
  const orderId = relId(p.order)
  if (orderId) {
    const doc = await payload.findByID({ collection: 'orders', id: orderId, depth: 0, overrideAccess: true })
    return { kind: 'order', doc }
  }
  const bookingId = relId(p.booking)
  if (!bookingId) return null
  const doc = await payload.findByID({ collection: 'bookings', id: bookingId, depth: 0, overrideAccess: true })
  return { kind: 'booking', doc }
}

async function addEvents(payload: BasePayload, t: Target, events: Event[]) {
  if (t.kind === 'order')
    await payload.update({
      collection: 'orders',
      id: t.doc.id,
      data: { timeline: withEvents(t.doc, events) },
      overrideAccess: true,
    })
  else
    await payload.update({
      collection: 'bookings',
      id: t.doc.id,
      data: { timeline: withEvents(t.doc, events) },
      overrideAccess: true,
    })
}

// Move the booking on after a successful online payment
async function applyPaid(payload: BasePayload, b: Booking, p: Payment) {
  const { docs } = await payload.find({
    collection: 'payments',
    where: { and: [{ booking: { equals: b.id } }, { status: { equals: 'succeeded' } }] },
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  const paid = docs.reduce((sum, x) => sum + (x.kind === 'refund' ? -x.amount : x.amount), 0)
  const full = paid >= (b.total ?? 0)
  const events: Event[] = [
    { event: 'payment received', note: `${label(p)} · ${formatTHB(p.amount)} · ${p.ref}` },
  ]
  let status: Booking['status'] = b.status

  if (b.status === 'hold' || b.status === 'pending_review') {
    status = full ? 'paid' : 'deposit_paid'
  } else if (b.status === 'deposit_paid' || b.status === 'paid') {
    // e.g. the customer paid a second QR after the first one went through
    status = full ? 'paid' : 'deposit_paid'
    events.push({ event: 'check duplicate payment', note: formatTHB(paid) })
  } else if (b.status === 'expired') {
    // Paid after the hold ran out: keep the booking if its seats are still free
    const depId = typeof b.departure === 'object' ? b.departure.id : b.departure
    const dep = await payload.findByID({
      collection: 'departures',
      id: depId,
      depth: 0,
      overrideAccess: true,
    })
    const { booked, held } = await countSeats(payload, depId)
    const pax = b.participants?.length ?? 0
    if (dep.status !== 'closed' && (dep.capacity ?? 0) - booked - held >= pax) {
      status = full ? 'paid' : 'deposit_paid'
      events.push({ event: 'paid after hold expired' })
    } else {
      events.push({ event: 'refund needed', note: 'paid after the hold expired; no seats left' })
    }
  } else {
    // Cancelled, refunded or completed: the money came in anyway
    events.push({ event: 'refund needed', note: `booking is ${b.status}` })
  }

  await payload.update({
    collection: 'bookings',
    id: b.id,
    data: { status, timeline: withEvents(b, events) },
    overrideAccess: true,
  })
}

// Move a shop order on after a successful online payment. Paying moves it to `paid`, which takes
// the items off stock (see hooks/orders).
async function applyOrderPaid(payload: BasePayload, o: Order, p: Payment) {
  const { docs } = await payload.find({
    collection: 'payments',
    where: { and: [{ order: { equals: o.id } }, { status: { equals: 'succeeded' } }] },
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  const paid = docs.reduce((sum, x) => sum + (x.kind === 'refund' ? -x.amount : x.amount), 0)
  const full = paid >= (o.total ?? 0)
  const events: Event[] = [
    { event: 'payment received', note: `${label(p)} · ${formatTHB(p.amount)} · ${p.ref}` },
  ]
  let status: Order['status'] = o.status

  if (o.status === 'pending_payment' || o.status === 'pending_review') {
    if (full) status = 'paid'
    else events.push({ event: 'check payment amount', note: formatTHB(paid) })
  } else if (['paid', 'packed', 'shipped', 'picked_up'].includes(o.status)) {
    events.push({ event: 'check duplicate payment', note: formatTHB(paid) })
  } else if (o.status === 'expired') {
    // Paid after the hold ran out: keep the order if the items are still in stock
    return withStockLock(async () => {
      const ids = (o.items ?? []).map((it) => relId(it.variant)).filter((x): x is number => !!x)
      const left = await availableStock(payload, ids, o.id)
      const ok = full && (o.items ?? []).every((it) => (left.get(relId(it.variant) ?? 0) ?? 0) >= (it.qty ?? 0))
      events.push(
        ok
          ? { event: 'paid after hold expired' }
          : { event: 'refund needed', note: 'paid after the hold expired; out of stock' },
      )
      await payload.update({
        collection: 'orders',
        id: o.id,
        data: { status: ok ? 'paid' : o.status, timeline: withEvents(o, events) },
        overrideAccess: true,
      })
    })
  } else {
    events.push({ event: 'refund needed', note: `order is ${o.status}` })
  }

  await payload.update({
    collection: 'orders',
    id: o.id,
    data: { status, timeline: withEvents(o, events) },
    overrideAccess: true,
  })
}

// Pending online payments of one booking or order (pay page load, 3-D Secure return)
export async function reconcilePending(
  payload: BasePayload,
  of: { booking: number } | { order: number },
) {
  const owner: Where = 'order' in of ? { order: { equals: of.order } } : { booking: { equals: of.booking } }
  const { docs } = await payload.find({
    collection: 'payments',
    where: {
      and: [owner, { status: { equals: 'pending' } }, { provider: { in: ONLINE } }],
    },
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  for (const p of docs) {
    try {
      await reconcilePayment(payload, p.id)
    } catch (err) {
      payload.logger.error({ err }, `Could not check payment ${p.ref}`)
    }
  }
}

// Webhooks: the event only tells us which charge to look at. If we have no record of it (the
// server failed between charging and saving), one is created from the charge's metadata.
export async function reconcileRef(payload: BasePayload, provider: ProviderId, ref: string) {
  const charge = await adapterFor(provider).get(ref)
  const found = await payload.find({
    collection: 'payments',
    where: { and: [{ provider: { equals: provider } }, { ref: { equals: charge.id } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  let p = found.docs[0]
  if (!p) {
    if (!charge.code || charge.status !== 'succeeded') return null
    const order = isOrderCode(charge.code)
    const owner = await payload.find({
      collection: order ? 'orders' : 'bookings',
      where: { code: { equals: charge.code } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const id = owner.docs[0]?.id
    if (!id) return null
    p = await payload.create({
      collection: 'payments',
      data: {
        ...(order ? { order: id } : { booking: id }),
        provider,
        method: charge.method,
        kind: order ? 'full' : 'deposit',
        amount: charge.amount,
        status: 'pending',
        ref: charge.id,
      },
      overrideAccess: true,
    })
  }
  return reconcilePayment(payload, p.id, charge)
}
