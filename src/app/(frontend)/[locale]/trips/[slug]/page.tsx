import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { isLocale } from '@/i18n/config'
import { getTrip } from '@/lib/content'
import { formatDate, formatTHB } from '@/lib/dates'
import type { DiveSite } from '@/payload-types'

type Props = { params: Promise<{ locale: string; slug: string }> }

const T = {
  th: {
    back: '← ทริปทั้งหมด',
    price: 'ราคาต่อคน',
    itinerary: 'กำหนดการ',
    day: 'วันที่',
    includes: 'ราคานี้รวม',
    excludes: 'ราคานี้ไม่รวม',
    sites: 'จุดดำน้ำ',
    departures: 'รอบออกเดินทาง',
    seatsLeft: 'ที่นั่งว่าง',
    full: 'เต็ม',
    none: 'ยังไม่มีรอบที่เปิดรับจอง',
  },
  en: {
    back: '← All trips',
    price: 'Price per person',
    itinerary: 'Itinerary',
    day: 'Day',
    includes: 'Includes',
    excludes: 'Excludes',
    sites: 'Dive sites',
    departures: 'Upcoming departures',
    seatsLeft: 'seats left',
    full: 'Full',
    none: 'No departures open yet',
  },
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  if (!isLocale(locale)) return {}
  const data = await getTrip(locale, slug)
  if (!data) return {}
  return {
    title: data.trip.seo?.title || data.trip.title,
    description: data.trip.seo?.description || data.trip.summary || undefined,
  }
}

export default async function TripPage({ params }: Props) {
  const { locale, slug } = await params
  if (!isLocale(locale)) notFound()
  const data = await getTrip(locale, slug)
  if (!data) notFound()
  const { trip, departures } = data
  const t = T[locale]
  const sites = (trip.diveSites ?? []).filter((s): s is DiveSite => typeof s === 'object')

  return (
    <article className="space-y-8">
      <a href={`/${locale}`} className="text-sm underline">
        {t.back}
      </a>
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">{trip.title}</h1>
        {trip.summary && <p className="text-neutral-600">{trip.summary}</p>}
        <p>
          {t.price}: <strong>{formatTHB(trip.price)}</strong>
        </p>
      </header>

      <section>
        <h2 className="mb-3 text-xl font-semibold">{t.departures}</h2>
        {departures.length === 0 ? (
          <p className="text-neutral-500">{t.none}</p>
        ) : (
          <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200">
            {departures.map((d) => {
              const left = Math.max(0, d.capacity - (d.seatsBooked ?? 0) - (d.seatsHeld ?? 0))
              return (
                <li key={d.id} className="flex items-center justify-between px-4 py-3">
                  <span>
                    {formatDate(d.startDate, locale)}
                    {d.endDate && d.endDate !== d.startDate
                      ? ` – ${formatDate(d.endDate, locale)}`
                      : ''}
                  </span>
                  <span
                    className={
                      left === 0 || d.status === 'full'
                        ? 'font-semibold text-red-700'
                        : 'font-semibold'
                    }
                  >
                    {left === 0 || d.status === 'full' ? t.full : `${left} ${t.seatsLeft}`}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {trip.itinerary && trip.itinerary.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-semibold">{t.itinerary}</h2>
          <ol className="space-y-2">
            {trip.itinerary.map((row) => (
              <li key={row.id}>
                <strong>
                  {t.day} {row.day}: {row.title}
                </strong>
                {row.text && <p className="text-neutral-600">{row.text}</p>}
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        {trip.includes && trip.includes.length > 0 && (
          <section>
            <h2 className="mb-2 text-lg font-semibold">{t.includes}</h2>
            <ul className="list-disc pl-5">
              {trip.includes.map((i) => (
                <li key={i.id}>{i.text}</li>
              ))}
            </ul>
          </section>
        )}
        {trip.excludes && trip.excludes.length > 0 && (
          <section>
            <h2 className="mb-2 text-lg font-semibold">{t.excludes}</h2>
            <ul className="list-disc pl-5">
              {trip.excludes.map((i) => (
                <li key={i.id}>{i.text}</li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {sites.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">{t.sites}</h2>
          <ul className="list-disc pl-5">
            {sites.map((s) => (
              <li key={s.id}>
                {s.name}
                {s.region ? ` (${s.region})` : ''}
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  )
}
