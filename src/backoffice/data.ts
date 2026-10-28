// Backoffice queries. Each reads through the Local API with the signed-in user's access rules
// (`s.as`) and returns plain, serializable view models for the pages and client components.
import type { Where } from 'payload'

import type {
  Booking,
  Course,
  Customer,
  Departure,
  Media,
  Payment,
  RentalItem,
  Trip,
  User,
} from '@/payload-types'

import { ymd } from './format'
import { CERT_RANK } from './i18n'
import type { Session } from './server'

type Rel<T> = number | T | null | undefined
const obj = <T>(v: Rel<T>): T | null => (v && typeof v === 'object' ? (v as T) : null)
export const relId = (v: Rel<{ id: number }>) => (v && typeof v === 'object' ? v.id : (v ?? null))

export const mediaUrl = (m: Rel<Media>) => obj(m)?.url ?? null

// Days before departure that the balance is due. Booking settings have no field for it yet, so
// Today and the booking panel use this shop rule for display only.
export const BALANCE_DAYS = 7

export const canBookings = (s: Session) => s.role === 'admin' || s.role === 'staff'
export const canContent = (s: Session) => s.role === 'admin' || s.role === 'editor'

export type DepartureVM = {
  id: number
  name: string
  kind: 'trip' | 'course'
  offeringId: number | null
  category: string
  start: string
  end: string
  days: number
  capacity: number
  booked: number
  held: number
  boat: string
  status: string
  notes: string
  photo: string | null
}

export function departureVM(d: Departure): DepartureVM {
  const offering = obj<Trip | Course>(d.kind === 'course' ? d.course : d.trip)
  const start = ymd(d.startDate)
  const end = d.endDate ? ymd(d.endDate) : start
  const gallery = offering?.gallery ?? []
  const days = Math.max(1, Math.round((Date.parse(end) - Date.parse(start)) / 864e5) + 1)
  return {
    id: d.id,
    name: offering?.title || d.title?.split(' · ')[0] || `#${d.id}`,
    kind: d.kind === 'course' ? 'course' : 'trip',
    offeringId: offering?.id ?? relId(d.kind === 'course' ? d.course : d.trip),
    category: d.kind === 'course' ? 'course' : ((offering as Trip | null)?.type ?? 'daytrip'),
    start,
    end,
    days,
    capacity: d.capacity ?? 0,
    booked: d.seatsBooked ?? 0,
    held: d.seatsHeld ?? 0,
    boat: d.boat ?? '',
    status: d.status ?? 'open',
    notes: d.notes ?? '',
    photo: mediaUrl(gallery[0] as Rel<Media>),
  }
}

export async function findDepartures(s: Session, where?: Where, limit = 500) {
  const res = await s.payload.find({
    collection: 'departures',
    where,
    sort: 'startDate',
    limit,
    depth: 2,
    locale: s.lang,
    ...s.as,
  })
  return res.docs.map(departureVM)
}

export type PaymentVM = {
  id: number
  kind: string
  provider: string
  amount: number
  status: string
  ref: string
  slip: { url: string; alt: string } | null
  at: string
  reviewedBy: string
}

export type ParticipantVM = {
  name: string
  certLevel: string
  certNo: string
  suitSize: string
  shoeSize: string
  rentals: string[]
  healthOk: boolean
  healthNotes: string
}

export type BookingVM = {
  id: number
  code: string
  status: string
  source: string
  created: string
  createdAt: string
  holdExpiresAt: string | null
  customer: {
    id: number
    name: string
    phone: string
    email: string
    lineId: string
    nationality: string
  } | null
  departure: DepartureVM | null
  participants: ParticipantVM[]
  total: number
  deposit: number
  balance: number
  payments: PaymentVM[]
  timeline: { at: string; event: string; note: string; by: string }[]
}

const userName = (u: Rel<User>) => {
  const x = obj<User>(u)
  return x ? x.name || x.email : ''
}

export function paidOf(b: Pick<BookingVM, 'payments'>) {
  let sum = 0
  for (const p of b.payments) {
    if (p.status !== 'succeeded') continue
    sum += p.kind === 'refund' ? -p.amount : p.amount
  }
  return sum
}

export function dueOf(b: Pick<BookingVM, 'payments' | 'status' | 'total'>) {
  if (['cancelled', 'refunded', 'expired'].includes(b.status)) return 0
  return Math.max(0, b.total - paidOf(b))
}

// Bookings with their departure, customer and payments
export async function findBookings(s: Session, where?: Where, limit = 1000): Promise<BookingVM[]> {
  const res = await s.payload.find({
    collection: 'bookings',
    where,
    sort: '-createdAt',
    limit,
    depth: 1,
    locale: s.lang,
    ...s.as,
  })
  const docs = res.docs as Booking[]
  if (!docs.length) return []

  const depIds = [...new Set(docs.map((b) => relId(b.departure)).filter((x): x is number => !!x))]
  const deps = depIds.length ? await findDepartures(s, { id: { in: depIds } }, depIds.length) : []
  const depById = new Map(deps.map((d) => [d.id, d]))

  const payments = new Map<number, PaymentVM[]>()
  if (canBookings(s)) {
    const pres = await s.payload.find({
      collection: 'payments',
      where: { booking: { in: docs.map((b) => b.id) } },
      sort: 'createdAt',
      pagination: false,
      depth: 1,
      locale: s.lang,
      ...s.as,
    })
    for (const p of pres.docs as Payment[]) {
      const bid = relId(p.booking as Rel<{ id: number }>)
      if (!bid) continue
      const slip = obj<Media>(p.slip)
      const list = payments.get(bid) ?? []
      list.push({
        id: p.id,
        kind: p.kind,
        provider: p.provider,
        amount: p.amount ?? 0,
        status: p.status,
        ref: p.ref ?? '',
        slip: slip?.url ? { url: slip.url, alt: slip.alt ?? '' } : null,
        at: p.createdAt,
        reviewedBy: userName(p.reviewedBy),
      })
      payments.set(bid, list)
    }
  }

  return docs.map((b) => {
    const c = obj<Customer>(b.customer)
    return {
      id: b.id,
      code: b.code ?? `#${b.id}`,
      status: b.status,
      source: b.source ?? 'website',
      created: ymd(b.createdAt),
      createdAt: b.createdAt,
      holdExpiresAt: b.holdExpiresAt ?? null,
      customer: c
        ? {
            id: c.id,
            name: c.name,
            phone: c.phone ?? '',
            email: c.email ?? '',
            lineId: c.lineId ?? '',
            nationality: c.nationality ?? '',
          }
        : null,
      departure: depById.get(relId(b.departure) ?? -1) ?? null,
      participants: (b.participants ?? []).map((p) => ({
        name: p.name,
        certLevel: p.certLevel ?? 'none',
        certNo: p.certNo ?? '',
        suitSize: p.suitSize ?? '',
        shoeSize: p.shoeSize ?? '',
        rentals: (p.rentals ?? []).map((r) => obj<RentalItem>(r)?.name ?? '').filter(Boolean),
        healthOk: p.healthOk !== false,
        healthNotes: p.healthNotes ?? '',
      })),
      total: b.total ?? 0,
      deposit: b.deposit ?? 0,
      balance: b.balance ?? 0,
      payments: payments.get(b.id) ?? [],
      timeline: (b.timeline ?? []).map((t) => ({
        at: t.at,
        event: t.event,
        note: t.note ?? '',
        by: userName(t.by),
      })),
    }
  })
}

export type CustomerOption = { id: number; name: string }
export async function customerOptions(s: Session): Promise<CustomerOption[]> {
  const res = await s.payload.find({
    collection: 'customers',
    sort: 'name',
    pagination: false,
    depth: 0,
    select: { name: true },
    ...s.as,
  })
  return res.docs.map((c) => ({ id: c.id, name: c.name }))
}

// Upcoming departures that can still take a booking
export async function bookableDepartures(s: Session, today: string) {
  const deps = await findDepartures(s, {
    and: [
      { startDate: { greater_than_equal: `${today}T00:00:00+07:00` } },
      { status: { not_equals: 'closed' } },
    ],
  })
  return deps
}

// Deposit % and hold minutes for labels such as "seats are held for 15 min". Booking settings
// are admin-only, so these two plain numbers are read on the server for every role (display only;
// the booking hook applies the real values when saving).
export async function bookingDefaults(s: Session) {
  const g = await s.payload.findGlobal({
    slug: 'booking-settings',
    depth: 0,
    select: { depositPct: true, holdMinutes: true },
    overrideAccess: true,
  })
  return { depositPct: g.depositPct ?? 30, holdMinutes: g.holdMinutes ?? 15 }
}

// Per-customer figures for the customer list and profile. The customer record has no cert or
// suit size, so these come from the participant with the customer's name (or the first one).
export function customerStats(customerId: number, all: BookingVM[]) {
  const bs = all
    .filter((b) => b.customer?.id === customerId)
    .sort((a, b) => (b.departure?.start ?? '').localeCompare(a.departure?.start ?? ''))
  let cert = ''
  let suit = ''
  for (const b of bs) {
    const p =
      b.participants.find((x) => x.name.trim() === b.customer?.name.trim()) ?? b.participants[0]
    if (p && CERT_RANK.indexOf(p.certLevel) > CERT_RANK.indexOf(cert)) cert = p.certLevel
    if (p?.suitSize && !suit) suit = p.suitSize
  }
  return {
    bookings: bs,
    spent: bs.reduce((sum, b) => sum + paidOf(b), 0),
    last: bs.find((b) => b.departure)?.departure?.start ?? null,
    first: bs.map((b) => b.created).sort()[0] ?? null,
    companions: bs.reduce((n, b) => n + Math.max(0, b.participants.length - 1), 0),
    cert,
    suit,
  }
}
