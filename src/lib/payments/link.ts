// The customer's pay link: /<locale>/pay/<code>?t=<payToken>, for a booking (DP-2611-0001) or a
// shop order (DP-ORD-2611-0001)
import { timingSafeEqual } from 'node:crypto'

import type { BasePayload } from 'payload'

import type { Booking, Order } from '@/payload-types'

export const payPath = (locale: string, code: string, token: string) =>
  `/${locale}/pay/${encodeURIComponent(code)}?t=${encodeURIComponent(token)}`

const BOOKING_CODE = /^DP-\d{4}-\d{4,6}$/
const ORDER_CODE = /^DP-ORD-\d{4}-\d{4,6}$/
export const isOrderCode = (code: string) => ORDER_CODE.test(code)

const same = (a: string, b: string) => {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

// The booking a pay link points at, or null when the code or token doesn't match
export async function bookingFromLink(
  payload: BasePayload,
  code: string,
  token: string,
  depth = 0,
): Promise<Booking | null> {
  if (!BOOKING_CODE.test(code) || !token || token.length > 100) return null
  const { docs } = await payload.find({
    collection: 'bookings',
    where: { code: { equals: code } },
    limit: 1,
    depth,
    overrideAccess: true,
  })
  const b = docs[0]
  return b?.payToken && same(b.payToken, token) ? b : null
}

// Same for a shop order
export async function orderFromLink(
  payload: BasePayload,
  code: string,
  token: string,
  depth = 0,
): Promise<Order | null> {
  if (!ORDER_CODE.test(code) || !token || token.length > 100) return null
  const { docs } = await payload.find({
    collection: 'orders',
    where: { code: { equals: code } },
    limit: 1,
    depth,
    overrideAccess: true,
  })
  const o = docs[0]
  return o?.payToken && same(o.payToken, token) ? o : null
}
