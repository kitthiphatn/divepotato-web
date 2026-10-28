import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import type { OfferingInput } from '@/backoffice/actions/catalog'
import { bookingDefaults, mediaLibrary } from '@/backoffice/data'
import { lexicalToBlocks } from '@/backoffice/blocks'
import { requireUser } from '@/backoffice/server'
import { TripEditor } from '@/backoffice/ui/TripEditor'

export const metadata: Metadata = { title: 'แก้ไขทริป · Edit trip' }

const relIds = (v: unknown) =>
  (Array.isArray(v) ? v : [])
    .map((m) => (m && typeof m === 'object' ? (m as { id: number }).id : (m as number)))
    .filter(Boolean)

export default async function TripEditPage({
  params,
}: {
  params: Promise<{ kind: string; id: string }>
}) {
  const s = await requireUser(['admin', 'editor'])
  const { kind, id } = await params
  if (kind !== 'trip' && kind !== 'course') notFound()
  if (id !== 'new' && !/^\d+$/.test(id)) notFound()
  const collection = kind === 'trip' ? 'trips' : 'courses'

  const [library, defaults] = await Promise.all([mediaLibrary(s), bookingDefaults(s)])

  let value: OfferingInput = {
    kind,
    id: null,
    published: false,
    slug: '',
    title: { th: '', en: '' },
    summary: { th: '', en: '' },
    description: { th: [], en: [] },
    descriptionDirty: { th: false, en: false },
    price: 0,
    type: 'daytrip',
    levelRequired: 'ow',
    depositPct: null,
    itinerary: kind === 'trip' ? [{ title: { th: '', en: '' }, text: { th: '', en: '' } }] : [],
    days: 1,
    padiCode: '',
    gallery: [],
  }

  if (id !== 'new') {
    const read = (locale: 'th' | 'en') =>
      s.payload
        .findByID({
          collection,
          id: Number(id),
          draft: true,
          depth: 0,
          locale,
          fallbackLocale: false,
          ...s.as,
        })
        .catch(() => null)
    const [th, en] = await Promise.all([read('th'), read('en')])
    if (!th || !en) notFound()
    const dth = lexicalToBlocks(th.description)
    const den = lexicalToBlocks(en.description)
    const enRows = new Map(('itinerary' in en ? (en.itinerary ?? []) : []).map((r) => [r.id, r]))
    value = {
      ...value,
      id: th.id,
      published: th._status === 'published',
      slug: th.slug,
      title: { th: th.title ?? '', en: en.title ?? '' },
      summary: { th: th.summary ?? '', en: en.summary ?? '' },
      description: { th: dth.blocks, en: den.blocks },
      descriptionLossy: { th: dth.lossy, en: den.lossy },
      price: th.price ?? 0,
      gallery: relIds(th.gallery),
    }
    if ('type' in th) {
      value.type = th.type
      value.levelRequired = th.levelRequired ?? 'ow'
      value.depositPct = th.depositPct ?? null
      value.itinerary = (th.itinerary ?? []).map((r) => ({
        id: r.id,
        title: { th: r.title ?? '', en: enRows.get(r.id)?.title ?? '' },
        text: { th: r.text ?? '', en: enRows.get(r.id)?.text ?? '' },
      }))
    }
    if ('days' in th) {
      value.days = th.days
      value.padiCode = th.padiCode ?? ''
    }
  }

  return (
    <TripEditor
      lang={s.lang}
      value={value}
      library={library}
      defaultDeposit={defaults.depositPct}
    />
  )
}
