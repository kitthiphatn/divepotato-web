import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'
import { notFound } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'

import { formatDate } from '@/lib/dates'
import type { Booking, Customer, RentalItem } from '@/payload-types'

import { PrintButton } from './PrintButton'
import { requireRole, templateProps } from './viewAuth'

const LEVELS: Record<string, string> = {
  none: '-',
  ow: 'OW',
  aow: 'AOW',
  rescue: 'Rescue',
  dm: 'DM',
}
const STATUS: Record<string, { th: string; en: string }> = {
  hold: { th: 'กันที่นั่ง', en: 'Hold' },
  pending_review: { th: 'รอตรวจสลิป', en: 'Pending review' },
  deposit_paid: { th: 'มัดจำแล้ว', en: 'Deposit paid' },
  paid: { th: 'ชำระครบ', en: 'Paid' },
  completed: { th: 'จบทริป', en: 'Completed' },
}
// Bookings that no longer bring anyone on the trip
const VOID = ['cancelled', 'refunded', 'expired']

const T = {
  th: {
    title: 'ใบรายชื่อผู้ร่วมทริป',
    print: 'พิมพ์',
    back: '← กลับไปหน้ารอบออกเดินทาง',
    boat: 'เรือ',
    seats: 'ที่นั่งจองแล้ว',
    cols: [
      '#',
      'ชื่อ',
      'รหัสจอง',
      'สถานะ',
      'ระดับบัตร',
      'เลขบัตร',
      'ชุด',
      'รองเท้า',
      'อุปกรณ์เช่า',
      'สุขภาพ',
    ],
    ok: 'ผ่าน',
    check: 'ต้องตรวจ',
    none: 'ยังไม่มีผู้ร่วมทริป',
    total: 'รวม',
    people: 'คน',
  },
  en: {
    title: 'Trip manifest',
    print: 'Print',
    back: '← Back to the departure',
    boat: 'Boat',
    seats: 'Seats booked',
    cols: [
      '#',
      'Name',
      'Booking',
      'Status',
      'Cert',
      'Cert no.',
      'Suit',
      'Shoe',
      'Rentals',
      'Health',
    ],
    ok: 'OK',
    check: 'Check',
    none: 'No participants yet',
    total: 'Total',
    people: 'people',
  },
}

// Printable list of everyone on a departure: /admin/manifest/:departureId
export async function ManifestView(props: AdminViewServerProps) {
  const { adminRoute } = requireRole(props, ['admin', 'staff', 'guide'])
  const { payload, i18n } = props.initPageResult.req
  const lang = i18n.language === 'en' ? 'en' : 'th'
  const t = T[lang]
  const segments = props.params?.segments
  const id = Array.isArray(segments) ? segments[1] : undefined
  if (!id || !/^\d+$/.test(id)) notFound()

  let departure
  try {
    departure = await payload.findByID({ collection: 'departures', id, depth: 0 })
  } catch {
    notFound()
  }
  const { docs: bookings } = await payload.find({
    collection: 'bookings',
    where: {
      and: [{ departure: { equals: departure.id } }, { status: { not_in: VOID } }],
    },
    sort: 'code',
    pagination: false,
    depth: 1,
    locale: lang,
  })

  const rows = bookings.flatMap((b: Booking) =>
    (b.participants ?? []).map((p) => ({ booking: b, p })),
  )

  return (
    <DefaultTemplate {...templateProps(props)}>
      <Gutter className="dp-manifest">
        <div className="dp-manifest__actions">
          <a href={`${adminRoute}/collections/departures/${departure.id}`}>{t.back}</a>
          <PrintButton label={t.print} />
        </div>
        <header className="dp-manifest__head">
          <p className="dp-muted">Dive Potato Scuba Diving · {t.title}</p>
          <h1>{departure.title}</h1>
          <p>
            {formatDate(departure.startDate, lang)}
            {departure.endDate ? ` – ${formatDate(departure.endDate, lang)}` : ''}
            {departure.boat ? ` · ${t.boat}: ${departure.boat}` : ''} · {t.seats}:{' '}
            {departure.seatsBooked ?? 0}/{departure.capacity}
          </p>
        </header>
        {rows.length === 0 ? (
          <p className="dp-muted">{t.none}</p>
        ) : (
          <table className="dp-table">
            <thead>
              <tr>
                {t.cols.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ booking, p }, i) => (
                <tr key={`${booking.id}-${p.id ?? i}`} className={p.healthOk ? '' : 'dp-row--warn'}>
                  <td>{i + 1}</td>
                  <td>
                    <strong>{p.name}</strong>
                    {i === 0 || rows[i - 1].booking.id !== booking.id ? (
                      <div className="dp-muted dp-small">
                        {typeof booking.customer === 'object'
                          ? (booking.customer as Customer).phone
                          : ''}
                      </div>
                    ) : null}
                  </td>
                  <td>{booking.code}</td>
                  <td>{STATUS[booking.status]?.[lang] ?? booking.status}</td>
                  <td>{LEVELS[p.certLevel ?? 'none'] ?? p.certLevel}</td>
                  <td>{p.certNo || '-'}</td>
                  <td>{p.suitSize || '-'}</td>
                  <td>{p.shoeSize || '-'}</td>
                  <td>
                    {(p.rentals ?? [])
                      .map((r) => (typeof r === 'object' ? (r as RentalItem).name : ''))
                      .filter(Boolean)
                      .join(', ') || '-'}
                  </td>
                  <td>
                    {p.healthOk ? t.ok : `⚠ ${t.check}`}
                    {p.healthNotes ? <div className="dp-small">{p.healthNotes}</div> : null}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={10}>
                  {t.total}: {rows.length} {t.people}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </Gutter>
    </DefaultTemplate>
  )
}
