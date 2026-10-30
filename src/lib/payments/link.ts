// The customer's pay link: /<locale>/pay/<booking code>?t=<payToken>
import { timingSafeEqual } from 'node:crypto'

import type { BasePayload } from 'payload'

import type { Booking } from '@/payload-types'

export const payPath = (locale: string, code: string, token: string) =>
  `/${locale}/pay/${encodeURIComponent(code)}?t=${encodeURIComponent(token)}`

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
  if (!/^DP-\d{4}-\d{4,6}$/.test(code) || !token || token.length > 100) return null
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
