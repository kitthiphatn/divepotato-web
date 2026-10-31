import type { Metadata } from 'next'

import { dueOf, findBookings, paidOf } from '@/backoffice/data'
import { fdy, money } from '@/backoffice/format'
import { pair, SOURCE_LABEL, STATUS_LABEL } from '@/backoffice/i18n'
import {
  BOOKING_CHIP_KEYS,
  BOOKING_CHIPS,
  bookingTotals,
  filterBookings,
  listQuery,
  payMethods,
  stamp,
} from '@/backoffice/lists'
import { BO } from '@/backoffice/nav'
import { requireUser } from '@/backoffice/server'
import { ListPrint } from '@/backoffice/ui/ListPrint'
import { expireStaleHolds } from '@/hooks/bookings'

export const metadata: Metadata = { title: 'รายงานการจอง · Bookings report' }

// /backoffice/bookings/print?status=<chip>&q=<search>: the bookings list with the same filter,
// laid out for A4 landscape; "Export PDF" on the list opens it and the browser saves the PDF
export default async function BookingsPrintPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const s = await requireUser(['admin', 'staff'])
  const { L, lang } = s
  const sp = await searchParams
  const chip = BOOKING_CHIP_KEYS.includes(sp.status ?? '') ? sp.status! : 'all'
  const q = (sp.q ?? '').trim()
  await expireStaleHolds(s.payload)
  const list = filterBookings(await findBookings(s), chip, q)
  const site = await s.payload.findGlobal({ slug: 'site-settings', depth: 0, ...s.as })
  const st = BOOKING_CHIPS.find(([k]) => k === chip)?.[1]
  const filter = [
    `${L('สถานะ', 'Status')}: ${st ? pair(lang, STATUS_LABEL[st]) : L('ทั้งหมด', 'All')}`,
    q ? `${L('ค้นหา', 'Search')}: "${q}"` : '',
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <ListPrint
      lang={lang}
      title={L('รายงานการจอง', 'Bookings report')}
      phone={site.contact?.phone}
      filter={filter}
      backHref={`${BO}/bookings${chip !== 'all' ? listQuery(chip, '') : ''}`}
      noun={L('การจอง', 'bookings')}
      totals={bookingTotals(list)}
      cols={[
        { label: L('รหัสการจอง', 'Booking') },
        { label: L('วันที่สร้าง', 'Created') },
        { label: L('สถานะ', 'Status') },
        { label: L('ทริป / คอร์ส', 'Trip / course') },
        { label: L('ลูกค้า', 'Customer') },
        { label: L('คน', 'Pax'), num: true, sum: 'people' },
        { label: L('ยอดรวม', 'Total'), num: true, sum: 'total' },
        { label: L('มัดจำ', 'Deposit'), num: true },
        { label: L('ชำระแล้ว', 'Paid'), num: true, sum: 'paid' },
        { label: L('ค้างชำระ', 'Due'), num: true, sum: 'due' },
        { label: L('วิธีชำระ', 'Paid by') },
      ]}
      rows={list.map((b) => ({
        key: b.id,
        cells: [
          <>
            <b className="nw">{b.code}</b>
            <br />
            <small>{pair(lang, SOURCE_LABEL[b.source], b.source)}</small>
          </>,
          <span key="at" className="nw">
            {stamp(b.createdAt)}
          </span>,
          <span key="st" className="nw">
            {pair(lang, STATUS_LABEL[b.status], b.status)}
          </span>,
          <>
            {b.departure?.name ?? '—'}
            {b.departure && (
              <>
                <br />
                <small>
                  {fdy(b.departure.start, lang)}
                  {b.departure.end !== b.departure.start ? ` – ${fdy(b.departure.end, lang)}` : ''}
                </small>
              </>
            )}
          </>,
          <>
            <b>{b.customer?.name ?? '—'}</b>
            {(b.customer?.phone || b.customer?.email) && (
              <>
                <br />
                <small>{[b.customer?.phone, b.customer?.email].filter(Boolean).join(' · ')}</small>
              </>
            )}
          </>,
          b.participants.length,
          money(b.total),
          money(b.deposit),
          money(paidOf(b)),
          money(dueOf(b)),
          <small key="by">{payMethods(b.payments, lang) || '—'}</small>,
        ],
      }))}
    />
  )
}
