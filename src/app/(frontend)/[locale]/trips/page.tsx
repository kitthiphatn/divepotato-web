import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { isLocale } from '@/i18n/config'
import { getSite, listDepartures, listTrips, seatsLeft } from '@/lib/content'
import type { Trip } from '@/payload-types'
import { bookingContact } from '@/site/booking'
import { TripCard, type BookCtx } from '@/site/components/cards'
import { PageIntro } from '@/site/components/PageIntro'
import { Schedule } from '@/site/components/Schedule'
import { monthKey, monthLabel } from '@/site/format'
import { getDict } from '@/site/i18n'
import { pageMeta } from '@/site/seo'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const TYPES = ['daytrip', 'liveaboard', 'overseas'] as const
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const t = getDict(locale)
  const [site, trips] = await Promise.all([getSite(locale), listTrips(locale)])
  return pageMeta({
    locale,
    path: '/trips',
    title: t.trips.title,
    description: t.trips.lede,
    image: trips.find((tr) => tr.gallery?.length)?.gallery?.[0] ?? site?.settings.hero?.background,
  })
}

export default async function TripsPage({ params, searchParams }: Props) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const sp = await searchParams
  const t = getDict(locale)
  const [site, trips, departures] = await Promise.all([
    getSite(locale),
    listTrips(locale),
    listDepartures('trip'),
  ])
  const ctx: BookCtx = {
    locale,
    contact: bookingContact(site),
    shopPct: site?.depositPct ?? 30,
    departures,
  }

  const type = (TYPES as readonly string[]).includes(one(sp.type)) ? one(sp.type) : ''
  const month = /^\d{4}-\d{2}$/.test(one(sp.month)) ? one(sp.month) : ''
  const pax = Math.max(1, Math.min(20, Number(one(sp.pax)) || 1))

  const byId = new Map(trips.map((tr) => [tr.id, tr]))
  const tripOf = (id: unknown) => byId.get(typeof id === 'object' && id ? (id as Trip).id : (id as number))
  const rows = departures.flatMap((dep) => {
    const trip = tripOf(dep.trip)
    return trip ? [{ dep, trip }] : []
  })
  const ofType = rows.filter((r) => !type || r.trip.type === type)
  const months = [...new Set(ofType.map((r) => monthKey(r.dep.startDate)))].sort()
  const shownRows = ofType.filter(
    (r) => (!month || monthKey(r.dep.startDate) === month) && (pax <= 1 || seatsLeft(r.dep) >= pax),
  )
  const shownTrips = trips.filter(
    (tr) =>
      (!type || tr.type === type) &&
      (!month && pax <= 1 ? true : shownRows.some((r) => r.trip.id === tr.id)),
  )

  const href = (next: { type?: string; month?: string }) => {
    const q = new URLSearchParams()
    const ty = next.type ?? type
    const mo = next.month ?? month
    if (ty) q.set('type', ty)
    if (mo) q.set('month', mo)
    if (pax > 1) q.set('pax', String(pax))
    const s = q.toString()
    return `/${locale}/trips${s ? `?${s}` : ''}`
  }

  return (
    <>
      <PageIntro locale={locale} eb={t.trips.eb} title={t.trips.title} lede={t.trips.lede} />
      <section className="sec tight">
        <div className="w">
          <div className="flt">
            <nav className="chips c" aria-label={t.trips.filterType}>
              <Link href={href({ type: '' })} aria-current={!type ? 'true' : undefined} scroll={false}>
                {t.common.all}
              </Link>
              {TYPES.map((ty) => (
                <Link key={ty} href={href({ type: ty })} aria-current={type === ty ? 'true' : undefined} scroll={false}>
                  {t.trips.type[ty]}
                </Link>
              ))}
            </nav>
            {months.length > 0 && (
              <nav className="chips c" aria-label={t.trips.filterMonth}>
                <Link href={href({ month: '' })} aria-current={!month ? 'true' : undefined} scroll={false}>
                  {t.trips.anyMonth}
                </Link>
                {months.map((m) => (
                  <Link key={m} href={href({ month: m })} aria-current={month === m ? 'true' : undefined} scroll={false}>
                    {monthLabel(locale, m)}
                  </Link>
                ))}
              </nav>
            )}
          </div>

          {shownTrips.length > 0 ? (
            <div className="tg">
              {shownTrips.map((tr) => (
                <TripCard key={tr.id} ctx={ctx} trip={tr} month={month || null} />
              ))}
            </div>
          ) : (
            <p className="empty">{t.trips.none}</p>
          )}

          <div className="block" id="schedule" style={{ marginTop: 96 }}>
            <h2 className="h3">{t.trips.schedule}</h2>
            <p className="lede" style={{ margin: '8px 0 24px', fontSize: 17 }}>
              {t.trips.scheduleLede}
            </p>
            {shownRows.length > 0 ? (
              <Schedule ctx={ctx} rows={shownRows} wide />
            ) : (
              <p className="empty">{t.trips.none}</p>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
