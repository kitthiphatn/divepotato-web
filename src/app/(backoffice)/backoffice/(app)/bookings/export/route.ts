import { csvResponse } from '@/backoffice/csv'
import { findBookings } from '@/backoffice/data'
import { todayYmd } from '@/backoffice/format'
import { BOOKING_CHIP_KEYS, bookingCsv, filterBookings } from '@/backoffice/lists'
import { routeUser } from '@/backoffice/server'
import { expireStaleHolds } from '@/hooks/bookings'

export const dynamic = 'force-dynamic'

// GET /backoffice/bookings/export?status=<chip>&q=<search>: the rows of the bookings list
// with the same filter, as CSV (same roles and access rules as the list)
export async function GET(req: Request) {
  const s = await routeUser(['admin', 'staff'])
  if (s instanceof Response) return s
  const sp = new URL(req.url).searchParams
  const chip = BOOKING_CHIP_KEYS.includes(sp.get('status') ?? '') ? sp.get('status')! : 'all'
  // Same as opening the list: holds that ran out are marked expired first
  await expireStaleHolds(s.payload)
  const list = filterBookings(await findBookings(s), chip, sp.get('q') ?? '')
  return csvResponse(bookingCsv(list, s.lang), `bookings-${todayYmd()}.csv`)
}
