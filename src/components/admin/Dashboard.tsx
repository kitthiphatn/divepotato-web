import type { ServerProps } from 'payload'

import { roleOf } from '@/access/roles'
import { addDays, dayStart, formatDate, formatTHB, shopDay } from '@/lib/dates'
import { fullness, fullnessBand } from '@/lib/fullness'
import type { Customer, Departure } from '@/payload-types'

const T = {
  th: {
    heading: 'ภาพรวมวันนี้',
    today: 'รอบออกเดินทางวันนี้',
    noneToday: 'วันนี้ไม่มีรอบออกเดินทาง',
    review: 'การจองที่รอตรวจสลิป',
    noneReview: 'ไม่มีสลิปรอตรวจ',
    full: 'รอบที่จองเกิน 80%',
    noneFull: 'ยังไม่มีรอบที่ใกล้เต็ม',
    deposits: 'ยอดมัดจำที่ได้รับเดือนนี้',
    seats: 'ที่นั่ง',
    manifest: 'ใบรายชื่อ',
    calendar: 'ดูปฏิทินรอบออกเดินทาง',
    payments: 'รายการ',
  },
  en: {
    heading: 'Today at a glance',
    today: "Today's departures",
    noneToday: 'No departures today',
    review: 'Bookings awaiting slip review',
    noneReview: 'No slips waiting',
    full: 'Departures over 80% full',
    noneFull: 'No departures are nearly full yet',
    deposits: 'Deposits received this month',
    seats: 'seats',
    manifest: 'Manifest',
    calendar: 'Open the departures calendar',
    payments: 'payments',
  },
}

// Shown above the admin dashboard's collection cards. Reads with the local API on the server.
export async function Dashboard({ payload, user, i18n }: ServerProps) {
  const role = roleOf(user)
  if (!role) return null
  const lang = i18n?.language === 'en' ? 'en' : 'th'
  const t = T[lang]
  const admin = '/admin'
  const today = shopDay(new Date())
  const canBookings = role === 'admin' || role === 'staff'

  const [todays, upcoming, review, deposits] = await Promise.all([
    payload.find({
      collection: 'departures',
      where: {
        and: [
          { startDate: { greater_than_equal: dayStart(today) } },
          { startDate: { less_than: dayStart(addDays(today, 1)) } },
        ],
      },
      sort: 'startDate',
      limit: 20,
      depth: 0,
    }),
    canBookings
      ? payload.find({
          collection: 'departures',
          where: {
            and: [
              { startDate: { greater_than_equal: dayStart(today) } },
              { status: { not_equals: 'closed' } },
            ],
          },
          sort: 'startDate',
          limit: 200,
          depth: 0,
        })
      : null,
    canBookings
      ? payload.find({
          collection: 'bookings',
          where: { status: { equals: 'pending_review' } },
          sort: 'createdAt',
          limit: 20,
          depth: 1,
          locale: lang,
        })
      : null,
    role === 'admin'
      ? payload.find({
          collection: 'payments',
          where: {
            and: [
              { kind: { equals: 'deposit' } },
              { status: { equals: 'succeeded' } },
              { createdAt: { greater_than_equal: dayStart(`${today.slice(0, 7)}-01`) } },
            ],
          },
          pagination: false,
          depth: 0,
        })
      : null,
  ])

  const nearlyFull = (upcoming?.docs ?? []).filter(
    (d) => fullness(d.seatsBooked, d.capacity) >= 0.8,
  )
  const depositTotal = (deposits?.docs ?? []).reduce((sum, p) => sum + (p.amount ?? 0), 0)

  const seats = (d: Departure) => `${d.seatsBooked ?? 0}/${d.capacity} ${t.seats}`

  return (
    <section className="dp-dash">
      <div className="dp-dash__head">
        <h2>{t.heading}</h2>
        <a href={`${admin}/departures-calendar`}>{t.calendar} →</a>
      </div>
      <div className="dp-dash__grid">
        <div className="dp-card">
          <h3>
            {t.today} <span className="dp-count">{todays.totalDocs}</span>
          </h3>
          {todays.docs.length === 0 && <p className="dp-muted">{t.noneToday}</p>}
          <ul>
            {todays.docs.map((d) => (
              <li key={d.id}>
                <a href={`${admin}/collections/departures/${d.id}`}>{d.title}</a>
                <span
                  className={`dp-pill dp-pill--${fullnessBand(fullness(d.seatsBooked, d.capacity), d.status)}`}
                >
                  {seats(d)}
                </span>
                <a className="dp-link-small" href={`${admin}/manifest/${d.id}`}>
                  {t.manifest}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {review && (
          <div className="dp-card">
            <h3>
              {t.review} <span className="dp-count">{review.totalDocs}</span>
            </h3>
            {review.docs.length === 0 && <p className="dp-muted">{t.noneReview}</p>}
            <ul>
              {review.docs.map((b) => (
                <li key={b.id}>
                  <a href={`${admin}/collections/bookings/${b.id}`}>{b.code}</a>
                  <span className="dp-muted">
                    {typeof b.customer === 'object' ? (b.customer as Customer).name : ''}
                  </span>
                  <span>{formatTHB(b.deposit)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {upcoming && (
          <div className="dp-card">
            <h3>
              {t.full} <span className="dp-count">{nearlyFull.length}</span>
            </h3>
            {nearlyFull.length === 0 && <p className="dp-muted">{t.noneFull}</p>}
            <ul>
              {nearlyFull.map((d) => (
                <li key={d.id}>
                  <a href={`${admin}/collections/departures/${d.id}`}>{d.title}</a>
                  <span
                    className={`dp-pill dp-pill--${fullnessBand(fullness(d.seatsBooked, d.capacity), d.status)}`}
                  >
                    {seats(d)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {deposits && (
          <div className="dp-card">
            <h3>{t.deposits}</h3>
            <p className="dp-big">{formatTHB(depositTotal)}</p>
            <p className="dp-muted">
              {formatDate(new Date(), lang, { day: undefined })} · {deposits.docs.length}{' '}
              {t.payments}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
