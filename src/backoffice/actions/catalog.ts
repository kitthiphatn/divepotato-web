'use server'

// Trips and courses editor. Saves the Thai content first, then the English content on the same
// rows (itinerary row ids are shared between languages), through the Local API as the user.
import { revalidatePath } from 'next/cache'

import { slugify } from '../format'
import { blocksToLexical, type Block } from '../blocks'
import { BO } from '../nav'
import { actionUser, errorMessage, isSession, type ActionResult } from '../server'

type Pair = { th: string; en: string }
export type OfferingInput = {
  kind: 'trip' | 'course'
  id: number | null
  published: boolean
  slug: string
  title: Pair
  summary: Pair
  description: { th: Block[]; en: Block[] }
  descriptionDirty: { th: boolean; en: boolean }
  // The stored description has formatting the simple editor can't show (display only)
  descriptionLossy?: { th: boolean; en: boolean }
  price: number
  // trips
  type?: 'daytrip' | 'liveaboard' | 'overseas'
  levelRequired?: 'none' | 'ow' | 'aow' | 'rescue' | 'dm'
  depositPct?: number | null
  itinerary?: { id?: string | null; title: Pair; text: Pair }[]
  // courses
  days?: number
  padiCode?: string
  gallery: number[]
}

export async function saveOfferingAction(v: OfferingInput): Promise<ActionResult> {
  const s = await actionUser(['admin', 'editor'])
  if (!isSession(s)) return s
  const { L } = s
  const titleTh = v.title.th.trim() || v.title.en.trim()
  if (!titleTh) return { ok: false, message: L('ใส่ชื่อทริป', 'Enter a title') }
  const price = Math.round(Number(v.price))
  if (!(price >= 0)) return { ok: false, message: L('ใส่ราคาให้ถูกต้อง', 'Enter a valid price') }
  const slug =
    v.slug.trim() ||
    slugify(v.title.en || '') ||
    `${v.kind}-${Math.random().toString(36).slice(2, 8)}`
  const status = v.published ? ('published' as const) : ('draft' as const)
  const desc = (locale: 'th' | 'en') =>
    v.descriptionDirty[locale]
      ? { description: blocksToLexical(v.description[locale]) as never }
      : {}
  const rows = v.itinerary ?? []

  try {
    let id = v.id
    if (v.kind === 'trip') {
      const th = {
        _status: status,
        slug,
        title: titleTh,
        summary: v.summary.th,
        ...desc('th'),
        type: v.type ?? 'daytrip',
        levelRequired: v.levelRequired ?? 'ow',
        price,
        depositPct:
          v.depositPct === null || v.depositPct === undefined ? null : Number(v.depositPct),
        itinerary: rows.map((r, i) => ({
          ...(r.id ? { id: r.id } : {}),
          day: i + 1,
          title: r.title.th.trim() || r.title.en.trim() || `${i + 1}`,
          text: r.text.th,
        })),
        gallery: v.gallery,
      }
      const doc = id
        ? await s.payload.update({ collection: 'trips', id, locale: 'th', data: th, ...s.as })
        : await s.payload.create({ collection: 'trips', locale: 'th', data: th, ...s.as })
      id = doc.id
      await s.payload.update({
        collection: 'trips',
        id,
        locale: 'en',
        data: {
          _status: status,
          title: v.title.en.trim() || titleTh,
          summary: v.summary.en,
          ...desc('en'),
          itinerary: (doc.itinerary ?? []).map((row, i) => ({
            id: row.id,
            day: row.day,
            title: rows[i]?.title.en.trim() || row.title,
            text: rows[i]?.text.en ?? '',
          })),
        },
        ...s.as,
      })
    } else {
      const th = {
        _status: status,
        slug,
        title: titleTh,
        summary: v.summary.th,
        ...desc('th'),
        price,
        days: Math.max(1, Math.round(Number(v.days) || 1)),
        padiCode: v.padiCode?.trim() || undefined,
        gallery: v.gallery,
      }
      const doc = id
        ? await s.payload.update({ collection: 'courses', id, locale: 'th', data: th, ...s.as })
        : await s.payload.create({ collection: 'courses', locale: 'th', data: th, ...s.as })
      id = doc.id
      await s.payload.update({
        collection: 'courses',
        id,
        locale: 'en',
        data: {
          _status: status,
          title: v.title.en.trim() || titleTh,
          summary: v.summary.en,
          ...desc('en'),
        },
        ...s.as,
      })
    }
    revalidatePath(BO, 'layout')
    return {
      ok: true,
      id,
      redirect: `${BO}/trips/${v.kind}/${id}`,
      message: v.published
        ? L('บันทึกและเผยแพร่บนเว็บไซต์แล้ว', 'Saved and published to the website')
        : L('บันทึกฉบับร่างแล้ว · ซ่อนจากเว็บไซต์', 'Draft saved · hidden from the website'),
    }
  } catch (err) {
    return { ok: false, message: errorMessage(err, L) }
  }
}
