import Link from 'next/link'

import { seatsLeft } from '@/lib/content'
import type { Course, Departure, Trip } from '@/payload-types'
import { dateRange, departureDays, depositOf, money, tripDepositPct } from '@/site/format'
import { getDict } from '@/site/i18n'

import { BookCourse, BookTrip, type BookCtx } from './cards'

type Row = { dep: Departure; trip?: Trip; course?: Course }

// Upcoming open departures with seats left and a "จอง" button per row (HTML, rendered on the
// server). `wide` adds the trip name column for the all-trips schedule.
export function Schedule({ ctx, rows, wide = false }: { ctx: BookCtx; rows: Row[]; wide?: boolean }) {
  const { locale } = ctx
  const t = getDict(locale)
  return (
    <ul className={`sch${wide ? ' wide' : ''}`}>
      {rows.map(({ dep, trip, course }) => {
        const left = seatsLeft(dep)
        const price = (trip?.price ?? course?.price) || 0
        const pct = trip ? tripDepositPct(trip, ctx.shopPct) : ctx.shopPct
        const days = departureDays(dep)
        const offering = trip ?? course
        const href = trip ? `/${locale}/trips/${trip.slug}` : course ? `/${locale}/courses/${course.slug}` : '#'
        return (
          <li key={dep.id}>
            <span className="d">
              {dateRange(locale, dep.startDate, dep.endDate)}
              <small>{t.common.days(days)}</small>
            </span>
            {wide && offering && (
              <span className="n">
                <Link href={href}>{offering.title}</Link>
                {trip && <small>{t.trips.type[trip.type]}</small>}
              </span>
            )}
            <span className={`s${left <= 0 ? ' full' : left <= 2 ? ' low' : ''}`}>
              {left <= 0 ? t.common.full : left <= 2 ? t.common.onlyLeft(left) : t.common.seatsLeft(left)}
            </span>
            <span className="p">
              <b className="num">{money(price)}</b>
              <small>
                {t.common.deposit} {money(depositOf(price, pct))}
              </small>
            </span>
            <span className="b">
              {left > 0 && trip && <BookTrip ctx={ctx} trip={trip} departureId={dep.id} />}
              {left > 0 && course && <BookCourse ctx={ctx} course={course} departureId={dep.id} />}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
