import { randomBytes } from 'node:crypto'

import type {
  BasePayload,
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeChangeHook,
  PayloadRequest,
} from 'payload'

// Statuses that take a seat for good; `hold` only reserves one until it expires, and
// `pending_review` (a transfer slip waiting for staff) holds it until staff approve or reject
export const SEAT_STATUSES = ['deposit_paid', 'paid', 'completed'] as const

type Rel = number | { id: number } | null | undefined
export const relId = (v: Rel): number | null =>
  v && typeof v === 'object' ? v.id : typeof v === 'number' ? v : null

const countOf = (v: unknown) => (Array.isArray(v) ? v.length : 0)

// DP-YYMM-NNNN, numbered per month
async function nextCode(req: PayloadRequest) {
  const now = new Date()
  const prefix = `DP-${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}-`
  const last = await req.payload.find({
    collection: 'bookings',
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

// Code, pay-link token, money, hold expiry and timeline. Totals always come from the departure's trip/course
// price × participants, with the trip's deposit % or the shop default from Booking settings.
export const prepareBooking: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  const next = { ...data }
  const settings = await req.payload.findGlobal({
    slug: 'booking-settings',
    req,
    overrideAccess: true,
    depth: 0,
  })

  if (operation === 'create' && !next.code) next.code = await nextCode(req)
  // Unguessable part of the customer's pay link
  if (operation === 'create' && !next.payToken) next.payToken = randomBytes(18).toString('base64url')

  const departureId = relId(next.departure ?? originalDoc?.departure)
  const participants = next.participants ?? originalDoc?.participants
  if (departureId) {
    const departure = await req.payload.findByID({
      collection: 'departures',
      id: departureId,
      depth: 1,
      draft: true,
      req,
      overrideAccess: true,
    })
    const offering = departure.kind === 'course' ? departure.course : departure.trip
    const price = offering && typeof offering === 'object' ? (offering.price ?? 0) : 0
    const tripPct =
      departure.kind !== 'course' &&
      offering &&
      typeof offering === 'object' &&
      'depositPct' in offering
        ? offering.depositPct
        : null
    const pct = typeof tripPct === 'number' ? tripPct : (settings.depositPct ?? 30)
    const total = price * countOf(participants)
    const deposit = Math.round((total * pct) / 100)
    next.total = total
    next.deposit = deposit
    next.balance = total - deposit
  }

  const status = next.status ?? originalDoc?.status
  if (status !== 'hold' && status !== 'expired') {
    // Only a held seat has an expiry
    next.holdExpiresAt = null
  } else if (status === 'hold' && !(next.holdExpiresAt ?? originalDoc?.holdExpiresAt)) {
    next.holdExpiresAt = new Date(Date.now() + (settings.holdMinutes ?? 15) * 60_000).toISOString()
  }

  // Record status changes on the booking's own timeline
  const timeline = Array.isArray(next.timeline)
    ? [...next.timeline]
    : [...(originalDoc?.timeline ?? [])]
  const at = new Date().toISOString()
  const by = req.user?.id ?? null
  if (operation === 'create' && timeline.length === 0) {
    timeline.push({ at, event: `created (${status})`, by })
  } else if (
    operation === 'update' &&
    originalDoc?.status &&
    next.status &&
    next.status !== originalDoc.status
  ) {
    timeline.push({ at, event: `status: ${originalDoc.status} → ${next.status}`, by })
  }
  next.timeline = timeline

  return next
}

// Seats taken (booked) and reserved (held) on a departure, counted from its bookings
export async function countSeats(payload: BasePayload, departureId: number, req?: PayloadRequest) {
  const { docs } = await payload.find({
    collection: 'bookings',
    where: { departure: { equals: departureId } },
    pagination: false,
    depth: 0,
    req,
    overrideAccess: true,
  })
  const now = Date.now()
  let booked = 0
  let held = 0
  for (const b of docs) {
    const n = countOf(b.participants)
    if ((SEAT_STATUSES as readonly string[]).includes(b.status)) booked += n
    else if (b.status === 'pending_review') held += n
    else if (b.status === 'hold' && (!b.holdExpiresAt || new Date(b.holdExpiresAt).getTime() > now))
      held += n
  }
  return { booked, held }
}

// Recount seats on a departure from its bookings (recounting avoids drift from missed updates)
export async function syncDepartureSeats(req: PayloadRequest, departureId: number) {
  const { booked, held } = await countSeats(req.payload, departureId, req)
  // `context` is merged into the shared request context, so restore the flag afterwards;
  // otherwise the booking's own audit entry (written after this hook) would be skipped too
  const previous = req.context.skipAudit
  try {
    await req.payload.update({
      collection: 'departures',
      id: departureId,
      data: { seatsBooked: booked, seatsHeld: held },
      req,
      overrideAccess: true,
      context: { skipAudit: true },
    })
  } finally {
    req.context.skipAudit = previous
  }
}

export const syncSeatsAfterChange: CollectionAfterChangeHook = async ({
  doc,
  operation,
  previousDoc,
  req,
}) => {
  const now = relId(doc.departure)
  const before = relId(previousDoc?.departure)
  const changed =
    operation === 'create' ||
    doc.status !== previousDoc?.status ||
    countOf(doc.participants) !== countOf(previousDoc?.participants) ||
    now !== before
  if (!changed) return doc
  for (const id of new Set([now, before])) if (id) await syncDepartureSeats(req, id)
  return doc
}

export const syncSeatsAfterDelete: CollectionAfterDeleteHook = async ({ doc, req }) => {
  const id = relId(doc.departure)
  if (id) await syncDepartureSeats(req, id)
  return doc
}

// Mark `hold` bookings whose hold has run out as `expired`; the seat hook then gives their seats
// back. There is no background job: this runs when a booking is requested, when a pay page
// loads and when staff open the bookings list. Optionally limited to one departure.
export async function expireStaleHolds(payload: BasePayload, departureId?: number) {
  const { docs } = await payload.find({
    collection: 'bookings',
    where: {
      and: [
        { status: { equals: 'hold' } },
        { holdExpiresAt: { less_than: new Date().toISOString() } },
        ...(departureId ? [{ departure: { equals: departureId } }] : []),
      ],
    },
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  for (const b of docs) {
    try {
      await payload.update({
        collection: 'bookings',
        id: b.id,
        data: { status: 'expired' },
        overrideAccess: true,
      })
    } catch (err) {
      payload.logger.error({ err }, `Could not expire hold ${b.code}`)
    }
  }
  return docs.length
}
