'use server'

// Booking actions from the booking panel. Everything goes through the Payload Local API as the
// signed-in user, so access rules and the booking hooks (code, totals, seat counts, timeline,
// audit log) run exactly as they do in the Payload admin panel.
import { revalidatePath } from 'next/cache'

import type { Booking, Payment } from '@/payload-types'

import { money } from '../format'
import { BO } from '../nav'
import { actionUser, errorMessage, isSession, type ActionResult, type Session } from '../server'

const STAFF = ['admin', 'staff'] as const
type Provider = Payment['provider']
const PROVIDERS: Provider[] = ['cash', 'transfer', 'slip', 'omise']

async function load(s: Session, id: number) {
  return (await s.payload.findByID({
    collection: 'bookings',
    id,
    depth: 0,
    ...s.as,
  })) as Booking
}

async function paymentsOf(s: Session, id: number) {
  const res = await s.payload.find({
    collection: 'payments',
    where: { booking: { equals: id } },
    pagination: false,
    depth: 0,
    ...s.as,
  })
  return res.docs as Payment[]
}

const paidSum = (payments: Payment[]) =>
  payments
    .filter((p) => p.status === 'succeeded')
    .reduce((sum, p) => sum + (p.kind === 'refund' ? -p.amount : p.amount), 0)

// The booking's timeline plus one event; the booking hook adds the status change itself
function withEvent(s: Session, b: Booking, event: string, note?: string) {
  return [
    ...(b.timeline ?? []).map((t) => ({
      id: t.id,
      at: t.at,
      event: t.event,
      note: t.note,
      by: typeof t.by === 'object' && t.by ? t.by.id : t.by,
    })),
    { at: new Date().toISOString(), event, note: note || undefined, by: s.user.id },
  ]
}

async function run(fn: (s: Session) => Promise<ActionResult>): Promise<ActionResult> {
  const s = await actionUser([...STAFF])
  if (!isSession(s)) return s
  try {
    const res = await fn(s)
    revalidatePath(BO, 'layout')
    return res
  } catch (err) {
    return { ok: false, message: errorMessage(err, s.L) }
  }
}

export async function approveSlipAction(bookingId: number): Promise<ActionResult> {
  return run(async (s) => {
    const b = await load(s, bookingId)
    if (b.status !== 'pending_review')
      return {
        ok: false,
        message: s.L('การจองนี้ไม่มีสลิปรอตรวจ', 'This booking has no slip to review'),
      }
    const payments = await paymentsOf(s, b.id)
    const pending = payments.find((p) => p.status === 'pending')
    if (!pending)
      return { ok: false, message: s.L('ไม่พบสลิปที่รอตรวจ', 'No pending slip was found') }
    await s.payload.update({
      collection: 'payments',
      id: pending.id,
      data: { status: 'succeeded' },
      ...s.as,
    })
    const paid = paidSum(payments) + pending.amount
    await s.payload.update({
      collection: 'bookings',
      id: b.id,
      data: {
        status: paid >= (b.total ?? 0) ? 'paid' : 'deposit_paid',
        timeline: withEvent(s, b, 'slip approved', money(pending.amount)),
      },
      ...s.as,
    })
    return { ok: true, message: s.L(`อนุมัติสลิป ${b.code} แล้ว`, `Slip approved for ${b.code}`) }
  })
}

export async function rejectSlipAction(bookingId: number, reason: string): Promise<ActionResult> {
  return run(async (s) => {
    const b = await load(s, bookingId)
    if (b.status !== 'pending_review')
      return {
        ok: false,
        message: s.L('การจองนี้ไม่มีสลิปรอตรวจ', 'This booking has no slip to review'),
      }
    for (const p of await paymentsOf(s, b.id))
      if (p.status === 'pending')
        await s.payload.update({
          collection: 'payments',
          id: p.id,
          data: { status: 'rejected' },
          ...s.as,
        })
    await s.payload.update({
      collection: 'bookings',
      id: b.id,
      data: { status: 'hold', timeline: withEvent(s, b, 'slip rejected', reason.slice(0, 200)) },
      ...s.as,
    })
    return {
      ok: true,
      message: s.L(
        'ปฏิเสธสลิปแล้ว · กันที่นั่งไว้รอสลิปใหม่',
        'Slip rejected · seats held for a new slip',
      ),
    }
  })
}

// Deposit taken at the shop (booking on hold) or the remaining balance
export async function recordPaymentAction(input: {
  bookingId: number
  kind: 'deposit' | 'balance'
  provider: string
  amount: number
  ref?: string
}): Promise<ActionResult> {
  return run(async (s) => {
    const b = await load(s, input.bookingId)
    const amount = Math.round(Number(input.amount))
    if (!Number.isFinite(amount) || amount <= 0)
      return { ok: false, message: s.L('กรอกจำนวนเงินให้ถูกต้อง', 'Enter a valid amount') }
    if (['cancelled', 'refunded', 'completed'].includes(b.status))
      return { ok: false, message: s.L('การจองนี้ปิดไปแล้ว', 'This booking is closed') }
    const provider = (
      PROVIDERS.includes(input.provider as Provider) ? input.provider : 'cash'
    ) as Provider
    const payments = await paymentsOf(s, b.id)
    await s.payload.create({
      collection: 'payments',
      data: {
        booking: b.id,
        kind: input.kind,
        provider,
        amount,
        status: 'succeeded',
        ref: input.ref?.trim() || undefined,
      },
      ...s.as,
    })
    const paid = paidSum(payments) + amount
    const status: Booking['status'] = paid >= (b.total ?? 0) ? 'paid' : 'deposit_paid'
    await s.payload.update({
      collection: 'bookings',
      id: b.id,
      data: { status, timeline: withEvent(s, b, 'payment recorded', money(amount)) },
      ...s.as,
    })
    return {
      ok: true,
      message:
        status === 'paid'
          ? s.L('รับชำระครบแล้ว', 'Paid in full')
          : s.L(`บันทึกการรับเงิน ${money(amount)} แล้ว`, `${money(amount)} recorded`),
    }
  })
}

export async function completeBookingAction(bookingId: number): Promise<ActionResult> {
  return run(async (s) => {
    const b = await load(s, bookingId)
    if (b.status !== 'paid')
      return {
        ok: false,
        message: s.L('ปิดงานได้เมื่อชำระครบแล้ว', 'Only fully paid bookings can be completed'),
      }
    await s.payload.update({
      collection: 'bookings',
      id: b.id,
      data: { status: 'completed' },
      ...s.as,
    })
    return { ok: true, message: s.L('ปิดงานเรียบร้อย', 'Booking completed') }
  })
}

export async function cancelBookingAction(input: {
  bookingId: number
  refund: number
  note?: string
}): Promise<ActionResult> {
  return run(async (s) => {
    const b = await load(s, input.bookingId)
    if (['cancelled', 'refunded', 'completed'].includes(b.status))
      return { ok: false, message: s.L('การจองนี้ปิดไปแล้ว', 'This booking is closed') }
    const payments = await paymentsOf(s, b.id)
    const paid = paidSum(payments)
    const refund = Math.max(0, Math.round(Number(input.refund) || 0))
    if (refund > paid)
      return {
        ok: false,
        message: s.L(
          `คืนเงินได้ไม่เกิน ${money(paid)}`,
          `Refund can't be more than ${money(paid)}`,
        ),
      }
    for (const p of payments)
      if (p.status === 'pending')
        await s.payload.update({
          collection: 'payments',
          id: p.id,
          data: { status: 'rejected' },
          ...s.as,
        })
    if (refund > 0)
      await s.payload.create({
        collection: 'payments',
        data: {
          booking: b.id,
          kind: 'refund',
          provider: 'transfer',
          amount: refund,
          status: 'succeeded',
        },
        ...s.as,
      })
    const note = [refund ? money(refund) : '', input.note?.trim() ?? ''].filter(Boolean).join(' · ')
    await s.payload.update({
      collection: 'bookings',
      id: b.id,
      data: {
        status: refund > 0 ? 'refunded' : 'cancelled',
        timeline: withEvent(s, b, 'cancelled', note.slice(0, 200)),
      },
      ...s.as,
    })
    return {
      ok: true,
      message:
        refund > 0
          ? s.L(
              `ยกเลิกและคืนเงิน ${money(refund)} แล้ว · คืนที่นั่งสู่ระบบ`,
              `Cancelled, ${money(refund)} refunded · seats released`,
            )
          : s.L('ยกเลิกแล้ว · คืนที่นั่งสู่ระบบ', 'Cancelled · seats released'),
    }
  })
}

// New booking on hold (seats are held for the minutes set in Booking settings)
export async function createBookingAction(input: {
  departureId: number
  customerId?: number
  newCustomer?: { name: string; phone?: string; email?: string }
  pax: number
  source: string
}): Promise<ActionResult> {
  return run(async (s) => {
    const pax = Math.max(1, Math.min(20, Math.round(Number(input.pax) || 1)))
    const dep = await s.payload.findByID({
      collection: 'departures',
      id: input.departureId,
      depth: 0,
      ...s.as,
    })
    const left = (dep.capacity ?? 0) - (dep.seatsBooked ?? 0) - (dep.seatsHeld ?? 0)
    if (dep.status === 'closed' || left < pax)
      return {
        ok: false,
        message: s.L(
          `รอบนี้เหลือที่นั่ง ${Math.max(0, left)} ที่`,
          `Only ${Math.max(0, left)} seats left`,
        ),
      }

    let customer
    if (input.newCustomer?.name?.trim()) {
      customer = await s.payload.create({
        collection: 'customers',
        data: {
          name: input.newCustomer.name.trim(),
          phone: input.newCustomer.phone?.trim() || undefined,
          email: input.newCustomer.email?.trim() || undefined,
        },
        ...s.as,
      })
    } else if (input.customerId) {
      customer = await s.payload.findByID({
        collection: 'customers',
        id: input.customerId,
        depth: 0,
        ...s.as,
      })
    } else {
      return { ok: false, message: s.L('เลือกลูกค้า', 'Choose a customer') }
    }

    const sources = ['website', 'line', 'phone', 'walk_in', 'agent'] as const
    const source = (sources as readonly string[]).includes(input.source)
      ? (input.source as (typeof sources)[number])
      : 'walk_in'
    const booking = await s.payload.create({
      collection: 'bookings',
      data: {
        status: 'hold',
        source,
        departure: dep.id,
        customer: customer.id,
        // The health form hasn't been filled in yet
        participants: Array.from({ length: pax }, (_, i) => ({
          name: i === 0 ? customer.name : s.L(`ผู้เดินทาง ${i + 1}`, `Guest ${i + 1}`),
          healthOk: false,
        })),
      },
      ...s.as,
    })
    return {
      ok: true,
      id: booking.id,
      message: s.L(`สร้างการจอง ${booking.code} แล้ว`, `Booking ${booking.code} created`),
    }
  })
}
