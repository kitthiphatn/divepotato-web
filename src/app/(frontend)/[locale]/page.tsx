import { notFound } from 'next/navigation'

import { isLocale } from '@/i18n/config'
import { getHome } from '@/lib/content'
import { formatTHB } from '@/lib/dates'
import type { Media } from '@/payload-types'

const T = {
  th: {
    trips: 'ทริปดำน้ำ',
    courses: 'คอร์สเรียน PADI',
    from: 'ราคา',
    days: 'วัน',
    empty: 'ยังไม่มีข้อมูล',
    type: { daytrip: 'ไปเช้าเย็นกลับ', liveaboard: 'ค้างเรือ', overseas: 'ต่างประเทศ' },
  },
  en: {
    trips: 'Dive trips',
    courses: 'PADI courses',
    from: 'Price',
    days: 'days',
    empty: 'Nothing here yet',
    type: { daytrip: 'Day trip', liveaboard: 'Liveaboard', overseas: 'Overseas' },
  },
}

const firstImage = (gallery: unknown) => {
  const m = Array.isArray(gallery) ? gallery[0] : null
  return m && typeof m === 'object' ? (m as Media) : null
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const t = T[locale]
  const home = await getHome(locale)

  return (
    <div className="space-y-12">
      <section>
        <h2 className="mb-4 text-2xl font-semibold">{t.trips}</h2>
        {!home?.trips.length && <p className="text-neutral-500">{t.empty}</p>}
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {home?.trips.map((trip) => {
            const img = firstImage(trip.gallery)
            return (
              <li key={trip.id} className="overflow-hidden rounded-lg border border-neutral-200">
                <a href={`/${locale}/trips/${trip.slug}`} className="block hover:bg-neutral-50">
                  {img?.url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img.url} alt={img.alt} className="aspect-video w-full object-cover" />
                  )}
                  <div className="space-y-1 p-4">
                    <p className="text-xs uppercase tracking-wide text-neutral-500">
                      {t.type[trip.type]}
                    </p>
                    <h3 className="font-semibold">{trip.title}</h3>
                    <p className="text-sm text-neutral-600">{trip.summary}</p>
                    <p className="text-sm font-semibold">
                      {t.from} {formatTHB(trip.price)}
                    </p>
                  </div>
                </a>
              </li>
            )
          })}
        </ul>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-semibold">{t.courses}</h2>
        {!home?.courses.length && <p className="text-neutral-500">{t.empty}</p>}
        <ul className="grid gap-4 sm:grid-cols-2">
          {home?.courses.map((course) => (
            <li key={course.id} className="rounded-lg border border-neutral-200 p-4">
              <p className="text-xs uppercase tracking-wide text-neutral-500">{course.padiCode}</p>
              <h3 className="font-semibold">{course.title}</h3>
              <p className="text-sm text-neutral-600">{course.summary}</p>
              <p className="text-sm font-semibold">
                {formatTHB(course.price)} · {course.days} {t.days}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
