// Filters, sort order and totals of the Bookings and Orders lists, shared by the list screens
// and their exports (CSV route and print page) so an export holds exactly the rows on screen.
// The list keeps its filter in state; exports receive it as ?status=<chip>&q=<search>.
import { dueOf, paidOf, type BookingVM, type OrderVM, type PaymentVM } from './data'
import { shopTime, ymd } from './format'
import {
  METHOD_LABEL,
  ORDER_STATUS_LABEL,
  pair,
  PROVIDER_LABEL,
  SOURCE_LABEL,
  STATUS_LABEL,
  translator,
  type Lang,
} from './i18n'
import type { CsvCell } from './csv'

// ---- bookings ----

const BOOKING_ORDER: Record<string, number> = {
  pending_review: 0,
  hold: 1,
  deposit_paid: 2,
  paid: 3,
  completed: 4,
  cancelled: 5,
  refunded: 5,
  expired: 6,
}
// Status chips; "cancelled" also covers refunded bookings
export const BOOKING_CHIPS = [
  ['review', 'pending_review'],
  ['hold', 'hold'],
  ['deposit', 'deposit_paid'],
  ['paid', 'paid'],
  ['done', 'completed'],
  ['cancelled', 'cancelled'],
  ['expired', 'expired'],
] as const
export const BOOKING_CHIP_KEYS = ['all', ...BOOKING_CHIPS.map(([k]) => k)]

export const bookingChipMatch = (chip: string, status: string) =>
  chip === 'all' ||
  BOOKING_CHIPS.some(
    ([k, st]) => k === chip && (st === status || (k === 'cancelled' && status === 'refunded')),
  )

export function filterBookings(bookings: BookingVM[], chip: string, q: string) {
  const s = q.trim().toLowerCase()
  return bookings
    .filter((b) => bookingChipMatch(chip, b.status))
    .filter(
      (b) =>
        !s ||
        [b.code, b.customer?.name, b.departure?.name, ...b.participants.map((p) => p.name)]
          .join(' ')
          .toLowerCase()
          .includes(s),
    )
    .sort(
      (a, b) =>
        (BOOKING_ORDER[a.status] ?? 9) - (BOOKING_ORDER[b.status] ?? 9) ||
        (a.departure?.start ?? '').localeCompare(b.departure?.start ?? ''),
    )
}

export type ListTotals = { count: number; people: number; total: number; paid: number; due: number }

// Plain sums of the rows in the list (cancelled rows included, so the figures match the CSV);
// paid is net of refunds and nothing is due on a cancelled, refunded or expired booking
export function bookingTotals(list: BookingVM[]): ListTotals {
  const t = { count: list.length, people: 0, total: 0, paid: 0, due: 0 }
  for (const b of list) {
    t.people += b.participants.length
    t.total += b.total
    t.paid += paidOf(b)
    t.due += dueOf(b)
  }
  return t
}

// "Omise · PromptPay QR, Cash at shop": how the money that came in was paid
export function payMethods(payments: PaymentVM[], lang: Lang) {
  const seen = new Set<string>()
  for (const p of payments) {
    if (p.status !== 'succeeded' || p.kind === 'refund') continue
    const method =
      p.method && p.provider !== 'slip' && p.provider !== 'cash' ? METHOD_LABEL[p.method] : null
    seen.add(
      `${pair(lang, PROVIDER_LABEL[p.provider], p.provider)}${method ? ` · ${pair(lang, method)}` : ''}`,
    )
  }
  return [...seen].join(', ')
}

// "2026-10-31 14:05" in shop time
export const stamp = (iso: string) => (iso ? `${ymd(iso)} ${shopTime(iso)}` : '')

export function bookingCsv(list: BookingVM[], lang: Lang): CsvCell[][] {
  const L = translator(lang)
  const head = [
    L('รหัสการจอง', 'Booking code'),
    L('วันที่สร้าง', 'Created'),
    L('สถานะ', 'Status'),
    L('ช่องทาง', 'Source'),
    L('ทริป / คอร์ส', 'Trip / course'),
    L('วันออกเดินทาง', 'Departure date'),
    L('ชื่อลูกค้า', 'Customer name'),
    L('เบอร์โทร', 'Phone'),
    L('อีเมล', 'Email'),
    L('จำนวนคน', 'People'),
    L('ยอดรวม', 'Total'),
    L('มัดจำ', 'Deposit'),
    L('ชำระแล้ว', 'Paid'),
    L('ค้างชำระ', 'Balance due'),
    L('วิธีชำระเงิน', 'Payment method'),
  ]
  const rows = list.map((b) => [
    b.code,
    stamp(b.createdAt),
    pair(lang, STATUS_LABEL[b.status], b.status),
    pair(lang, SOURCE_LABEL[b.source], b.source),
    b.departure?.name ?? '',
    b.departure?.start ?? '',
    b.customer?.name ?? '',
    b.customer?.phone ?? '',
    b.customer?.email ?? '',
    b.participants.length,
    b.total,
    b.deposit,
    paidOf(b),
    dueOf(b),
    payMethods(b.payments, lang),
  ])
  return [head, ...rows]
}

// ---- shop orders ----

// Work first: slips to review, paid orders to pack, packed orders to hand over
const ORDER_ORDER: Record<string, number> = {
  pending_review: 0,
  paid: 1,
  packed: 2,
  pending_payment: 3,
  shipped: 4,
  picked_up: 4,
  cancelled: 5,
  refunded: 5,
  expired: 6,
}
export const ORDER_CHIPS = [
  ['review', ['pending_review']],
  ['topack', ['paid']],
  ['packed', ['packed']],
  ['waiting', ['pending_payment']],
  ['done', ['shipped', 'picked_up']],
  ['cancelled', ['cancelled', 'refunded']],
  ['expired', ['expired']],
] as const
export const ORDER_CHIP_KEYS = ['all', ...ORDER_CHIPS.map(([k]) => k)]

export const orderChipMatch = (chip: string, status: string) =>
  chip === 'all' ||
  ORDER_CHIPS.some(([k, sts]) => k === chip && (sts as readonly string[]).includes(status))

export const orderChipLabel = (lang: Lang): Record<string, string> => {
  const L = translator(lang)
  return {
    all: L('ทั้งหมด', 'All'),
    review: L('รอตรวจสลิป', 'Slip to review'),
    topack: L('รอแพ็ก', 'To pack'),
    packed: L('แพ็กแล้ว', 'Packed'),
    waiting: L('รอชำระ', 'Awaiting payment'),
    done: L('ส่งมอบแล้ว', 'Handed over'),
    cancelled: L('ยกเลิก/คืนเงิน', 'Cancelled'),
    expired: L('หมดเวลา', 'Expired'),
  }
}

export function filterOrders(orders: OrderVM[], chip: string, q: string) {
  const s = q.trim().toLowerCase()
  return orders
    .filter((o) => orderChipMatch(chip, o.status))
    .filter(
      (o) =>
        !s ||
        [
          o.code,
          o.customer?.name,
          o.customer?.phone,
          o.trackingNo,
          ...o.items.map((it) => it.title),
        ]
          .join(' ')
          .toLowerCase()
          .includes(s),
    )
    .sort(
      (a, b) =>
        (ORDER_ORDER[a.status] ?? 9) - (ORDER_ORDER[b.status] ?? 9) ||
        b.createdAt.localeCompare(a.createdAt),
    )
}

const ORDER_VOID = ['cancelled', 'refunded', 'expired']
export const orderDue = (o: OrderVM) =>
  ORDER_VOID.includes(o.status) ? 0 : Math.max(0, o.total - paidOf(o))
export const itemCount = (o: OrderVM) => o.items.reduce((n, it) => n + it.qty, 0)

// Same figures as the bookings summary; "people" is the number of items for orders
export function orderTotals(list: OrderVM[]): ListTotals {
  const t = { count: list.length, people: 0, total: 0, paid: 0, due: 0 }
  for (const o of list) {
    t.people += itemCount(o)
    t.total += o.total
    t.paid += paidOf(o)
    t.due += orderDue(o)
  }
  return t
}

export function orderCsv(list: OrderVM[], lang: Lang): CsvCell[][] {
  const L = translator(lang)
  const head = [
    L('รหัสคำสั่งซื้อ', 'Order code'),
    L('วันที่สั่ง', 'Created'),
    L('สถานะ', 'Status'),
    L('ชื่อลูกค้า', 'Customer name'),
    L('เบอร์โทร', 'Phone'),
    L('อีเมล', 'Email'),
    L('สินค้า', 'Items'),
    L('จำนวนชิ้น', 'Pieces'),
    L('การรับสินค้า', 'Delivery'),
    L('เลขพัสดุ', 'Tracking no.'),
    L('ค่าสินค้า', 'Subtotal'),
    L('ค่าส่ง', 'Shipping'),
    L('ยอดรวม', 'Total'),
    L('ชำระแล้ว', 'Paid'),
    L('ค้างชำระ', 'Balance due'),
    L('วิธีชำระเงิน', 'Payment method'),
  ]
  const rows = list.map((o) => [
    o.code,
    stamp(o.createdAt),
    pair(lang, ORDER_STATUS_LABEL[o.status], o.status),
    o.customer?.name ?? '',
    o.customer?.phone ?? '',
    o.customer?.email ?? '',
    o.items.map((it) => `${it.title}${it.size ? ` (${it.size})` : ''} ×${it.qty}`).join('; '),
    itemCount(o),
    o.delivery === 'ship' ? L('ส่งไปรษณีย์', 'Post') : L('รับที่ร้าน', 'Pickup'),
    o.trackingNo,
    o.subtotal,
    o.shippingFee,
    o.total,
    paidOf(o),
    orderDue(o),
    payMethods(o.payments, lang),
  ])
  return [head, ...rows]
}

// ?status=…&q=… for the export links; "all" and an empty search are left out
export function listQuery(chip: string, q: string) {
  const p = new URLSearchParams()
  if (chip && chip !== 'all') p.set('status', chip)
  if (q.trim()) p.set('q', q.trim())
  const s = p.toString()
  return s ? `?${s}` : ''
}
