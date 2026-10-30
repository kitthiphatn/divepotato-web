import type { Metadata } from 'next'

import {
  BALANCE_DAYS,
  bookableDepartures,
  bookingDefaults,
  customerOptions,
  findBookings,
} from '@/backoffice/data'
import { todayYmd } from '@/backoffice/format'
import { requireUser } from '@/backoffice/server'
import { expireStaleHolds } from '@/hooks/bookings'
import { BookingsClient } from '@/backoffice/ui/Bookings'

export const metadata: Metadata = { title: 'การจอง · Bookings' }

const CHIP_KEYS = ['all', 'review', 'hold', 'deposit', 'paid', 'done', 'cancelled', 'expired']

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const s = await requireUser(['admin', 'staff'])
  const sp = await searchParams
  const today = todayYmd()
  // No background job: holds that ran out are marked expired whenever staff open the list
  await expireStaleHolds(s.payload)
  const [bookings, departures, customers, defaults] = await Promise.all([
    findBookings(s),
    bookableDepartures(s, today),
    customerOptions(s),
    bookingDefaults(s),
  ])
  const open = Number(sp.open) || null
  const num = (v?: string) => (v && /^\d+$/.test(v) ? Number(v) : undefined)

  return (
    <BookingsClient
      // Remount when the URL asks for another booking (e.g. from Today or a departure)
      key={`${sp.open ?? ''}|${sp.new ?? ''}|${sp.status ?? ''}`}
      lang={s.lang}
      bookings={bookings}
      departures={departures}
      customers={customers}
      holdMinutes={defaults.holdMinutes}
      depositPct={defaults.depositPct}
      balanceDays={BALANCE_DAYS}
      today={today}
      initial={{
        open: open && bookings.some((b) => b.id === open) ? open : null,
        status: CHIP_KEYS.includes(sp.status ?? '') ? sp.status! : 'all',
        newBooking: sp.new ? { dep: num(sp.dep), cust: num(sp.cust) } : null,
      }}
    />
  )
}
