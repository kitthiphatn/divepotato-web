'use server'

// Shop order actions from the orders panel. Like the booking actions they go through the Local
// API as the signed-in user, so access rules and the order hook (stock, timeline, audit log) run.
import { revalidatePath } from 'next/cache'

import type { Order, Payment } from '@/payload-types'

import { money } from '../format'
import { BO } from '../nav'
import { actionUser, errorMessage, isSession, type ActionResult, type Session } from '../server'

const STAFF = ['admin', 'staff'] as const
const CLOSED: Order['status'][] = ['cancelled', 'refunded', 'expired']
const isPendingSlip = (p: Payment) => p.status === 'pending' && p.provider === 'slip'

async function load(s: Session, id: number) {
  return (await s.payload.findByID({ collection: 'orders', id, depth: 0, ...s.as })) as Order
}

async function paymentsOf(s: Session, id: number) {
  const res = await s.payload.find({
    collection: 'payments',
    where: { order: { equals: id } },
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

// The order's timeline plus one event; the order hook adds the status change itself
function withEvent(s: Session, o: Order, event: string, note?: string) {
  return [
    ...(o.timeline ?? []).map((t) => ({
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

// Approving the slip marks the order paid, which takes the items off stock
export async function approveOrderSlipAction(orderId: number): Promise<ActionResult> {
  return run(async (s) => {
    const o = await load(s, orderId)
    if (o.status !== 'pending_review')
      return { ok: false, message: s.L('คำสั่งซื้อนี้ไม่มีสลิปรอตรวจ', 'This order has no slip to review') }
    const pending = (await paymentsOf(s, o.id)).find(isPendingSlip)
    if (!pending) return { ok: false, message: s.L('ไม่พบสลิปที่รอตรวจ', 'No pending slip was found') }
    await s.payload.update({
      collection: 'payments',
      id: pending.id,
      data: { status: 'succeeded' },
      ...s.as,
    })
    await s.payload.update({
      collection: 'orders',
      id: o.id,
      data: { status: 'paid', timeline: withEvent(s, o, 'slip approved', money(pending.amount)) },
      ...s.as,
    })
    return { ok: true, message: s.L(`อนุมัติสลิป ${o.code} แล้ว · ตัดสต็อกแล้ว`, `Slip approved for ${o.code} · stock taken`) }
  })
}

// Back to waiting for payment, with a fresh hold, so the customer can pay again on the same link
export async function rejectOrderSlipAction(orderId: number, reason: string): Promise<ActionResult> {
  return run(async (s) => {
    const o = await load(s, orderId)
    if (o.status !== 'pending_review')
      return { ok: false, message: s.L('คำสั่งซื้อนี้ไม่มีสลิปรอตรวจ', 'This order has no slip to review') }
    for (const p of await paymentsOf(s, o.id))
      if (isPendingSlip(p))
        await s.payload.update({ collection: 'payments', id: p.id, data: { status: 'rejected' }, ...s.as })
    await s.payload.update({
      collection: 'orders',
      id: o.id,
      data: {
        status: 'pending_payment',
        holdExpiresAt: null,
        timeline: withEvent(s, o, 'slip rejected', reason.slice(0, 200)),
      },
      ...s.as,
    })
    return {
      ok: true,
      message: s.L('ปฏิเสธสลิปแล้ว · จองสินค้าไว้รอชำระใหม่', 'Slip rejected · items held for a new payment'),
    }
  })
}

const NEXT: Partial<Record<Order['status'], Order['status'][]>> = {
  paid: ['packed', 'shipped', 'picked_up'],
  packed: ['shipped', 'picked_up'],
}

// Packed → shipped (post) or picked up (shop). Shipping needs a tracking number.
export async function setOrderStatusAction(input: {
  orderId: number
  status: 'packed' | 'shipped' | 'picked_up'
  trackingNo?: string
}): Promise<ActionResult> {
  return run(async (s) => {
    const o = await load(s, input.orderId)
    if (!NEXT[o.status]?.includes(input.status))
      return { ok: false, message: s.L('เปลี่ยนสถานะนี้ไม่ได้', "Can't move the order to that status") }
    const trackingNo = (input.trackingNo ?? o.trackingNo ?? '').trim().slice(0, 60)
    if (input.status === 'shipped' && !trackingNo)
      return { ok: false, message: s.L('ใส่เลขพัสดุก่อน', 'Enter the tracking number first') }
    await s.payload.update({
      collection: 'orders',
      id: o.id,
      data: { status: input.status, ...(input.status === 'shipped' ? { trackingNo } : {}) },
      ...s.as,
    })
    return {
      ok: true,
      message:
        input.status === 'packed'
          ? s.L('แพ็กแล้ว', 'Marked packed')
          : input.status === 'shipped'
            ? s.L(`จัดส่งแล้ว · ${trackingNo}`, `Shipped · ${trackingNo}`)
            : s.L('ลูกค้ารับสินค้าแล้ว', 'Marked picked up'),
    }
  })
}

export async function setTrackingAction(orderId: number, trackingNo: string): Promise<ActionResult> {
  return run(async (s) => {
    const o = await load(s, orderId)
    const value = trackingNo.trim().slice(0, 60)
    await s.payload.update({
      collection: 'orders',
      id: o.id,
      data: { trackingNo: value || null, timeline: withEvent(s, o, 'tracking number', value || '-') },
      ...s.as,
    })
    return { ok: true, message: s.L('บันทึกเลขพัสดุแล้ว', 'Tracking number saved') }
  })
}

// Cancel, with an optional refund of what was paid. Paid stock goes back unless the order
// already left the shop (see hooks/orders).
export async function cancelOrderAction(input: {
  orderId: number
  refund: number
  note?: string
}): Promise<ActionResult> {
  return run(async (s) => {
    const o = await load(s, input.orderId)
    if (CLOSED.includes(o.status))
      return { ok: false, message: s.L('คำสั่งซื้อนี้ปิดไปแล้ว', 'This order is closed') }
    const payments = await paymentsOf(s, o.id)
    const paid = paidSum(payments)
    const refund = Math.max(0, Math.round(Number(input.refund) || 0))
    if (refund > paid)
      return {
        ok: false,
        message: s.L(`คืนเงินได้ไม่เกิน ${money(paid)}`, `Refund can't be more than ${money(paid)}`),
      }
    for (const p of payments)
      if (p.status === 'pending')
        await s.payload.update({ collection: 'payments', id: p.id, data: { status: 'rejected' }, ...s.as })
    if (refund > 0)
      await s.payload.create({
        collection: 'payments',
        data: { order: o.id, kind: 'refund', provider: 'transfer', amount: refund, status: 'succeeded' },
        ...s.as,
      })
    const note = [refund ? money(refund) : '', input.note?.trim() ?? ''].filter(Boolean).join(' · ')
    const gone = o.status === 'shipped' || o.status === 'picked_up'
    await s.payload.update({
      collection: 'orders',
      id: o.id,
      data: {
        status: refund > 0 ? 'refunded' : 'cancelled',
        timeline: withEvent(s, o, 'cancelled', note.slice(0, 200)),
      },
      ...s.as,
    })
    const back = o.stockDeducted && !gone
    return {
      ok: true,
      message: [
        refund > 0 ? s.L(`ยกเลิกและคืนเงิน ${money(refund)} แล้ว`, `Cancelled, ${money(refund)} refunded`) : s.L('ยกเลิกแล้ว', 'Cancelled'),
        back ? s.L('คืนสินค้าเข้าสต็อกแล้ว', 'stock put back') : '',
      ]
        .filter(Boolean)
        .join(' · '),
    }
  })
}
