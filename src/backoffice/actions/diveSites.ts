'use server'

// Dive sites: add, edit and delete through the Local API as the signed-in user (admin/editor)
import { revalidatePath } from 'next/cache'

import { BO } from '../nav'
import { actionUser, errorMessage, isSession, type ActionResult } from '../server'

type Pair = { th: string; en: string }
export type DiveSiteInput = {
  id: number | null
  name: Pair
  region: Pair
  description: Pair
  image: number | null
}

const CONTENT = ['admin', 'editor'] as const
const opt = (v: string) => v.trim() || null

export async function saveDiveSiteAction(v: DiveSiteInput): Promise<ActionResult> {
  const s = await actionUser([...CONTENT])
  if (!isSession(s)) return s
  const { L } = s
  const nameTh = v.name.th.trim() || v.name.en.trim()
  if (!nameTh) return { ok: false, message: L('ใส่ชื่อจุดดำน้ำ', 'Enter the dive site name') }
  try {
    const th = {
      name: nameTh,
      region: opt(v.region.th),
      description: opt(v.description.th),
      image: v.image,
    }
    const doc = v.id
      ? await s.payload.update({
          collection: 'dive-sites',
          id: v.id,
          locale: 'th',
          data: th,
          ...s.as,
        })
      : await s.payload.create({ collection: 'dive-sites', locale: 'th', data: th, ...s.as })
    await s.payload.update({
      collection: 'dive-sites',
      id: doc.id,
      locale: 'en',
      data: {
        name: v.name.en.trim() || nameTh,
        region: opt(v.region.en),
        description: opt(v.description.en),
      },
      ...s.as,
    })
    revalidatePath(BO, 'layout')
    return {
      ok: true,
      id: doc.id,
      message: v.id
        ? L('บันทึกจุดดำน้ำแล้ว', 'Dive site saved')
        : L('เพิ่มจุดดำน้ำแล้ว', 'Dive site added'),
    }
  } catch (err) {
    return { ok: false, message: errorMessage(err, L) }
  }
}

export async function deleteDiveSiteAction(id: number): Promise<ActionResult> {
  const s = await actionUser([...CONTENT])
  if (!isSession(s)) return s
  try {
    await s.payload.delete({ collection: 'dive-sites', id, ...s.as })
    revalidatePath(BO, 'layout')
    return { ok: true, message: s.L('ลบจุดดำน้ำแล้ว', 'Dive site deleted') }
  } catch (err) {
    return { ok: false, message: errorMessage(err, s.L) }
  }
}
