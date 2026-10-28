import type { Metadata } from 'next'

import { mediaLibrary, relId } from '@/backoffice/data'
import { BO } from '@/backoffice/nav'
import { requireUser } from '@/backoffice/server'
import { DiveSitesManager, type DiveSiteRow } from '@/backoffice/ui/DiveSites'
import { SubTabs } from '@/backoffice/ui/fields'

export const metadata: Metadata = { title: 'จุดดำน้ำ · Dive sites' }

// /backoffice/trips/sites: the dive sites trips link to
export default async function DiveSitesPage() {
  const s = await requireUser(['admin', 'editor'])
  const { L } = s
  const loc = (locale: 'th' | 'en') => ({ locale, fallbackLocale: false as const, depth: 0 })
  const opts = { pagination: false as const, sort: 'name', ...s.as }
  const [th, en, trips, library] = await Promise.all([
    s.payload.find({ collection: 'dive-sites', ...opts, ...loc('th') }),
    s.payload.find({ collection: 'dive-sites', ...opts, ...loc('en') }),
    s.payload.find({
      collection: 'trips',
      draft: true,
      pagination: false,
      depth: 0,
      locale: s.lang,
      select: { title: true, diveSites: true },
      ...s.as,
    }),
    mediaLibrary(s),
  ])
  const enById = new Map(en.docs.map((d) => [d.id, d]))
  const sites: DiveSiteRow[] = th.docs.map((d) => {
    const e = enById.get(d.id)
    return {
      id: d.id,
      name: { th: d.name ?? '', en: e?.name ?? '' },
      region: { th: d.region ?? '', en: e?.region ?? '' },
      description: { th: d.description ?? '', en: e?.description ?? '' },
      image: relId(d.image),
      trips: trips.docs
        .filter((t) => (t.diveSites ?? []).some((x) => relId(x) === d.id))
        .map((t) => t.title),
    }
  })

  return (
    <>
      <div className="ph">
        <div>
          <h1>{L('ทริปและคอร์ส', 'Trips & courses')}</h1>
          <p className="lede">
            {L(
              'จุดดำน้ำที่ทริปพาไป ใช้แสดงในหน้าทริปบนเว็บไซต์',
              'The dive sites trips visit, shown on the trip pages',
            )}
          </p>
        </div>
      </div>
      <SubTabs
        items={[
          {
            href: `${BO}/trips`,
            label: L('ทริปและคอร์ส', 'Trips & courses'),
            icon: 'map',
            on: false,
          },
          { href: `${BO}/trips/sites`, label: L('จุดดำน้ำ', 'Dive sites'), icon: 'mask', on: true },
        ]}
      />
      <DiveSitesManager
        key={th.docs.map((d) => `${d.id}:${d.updatedAt}`).join('|')}
        lang={s.lang}
        sites={sites}
        library={library}
      />
    </>
  )
}
