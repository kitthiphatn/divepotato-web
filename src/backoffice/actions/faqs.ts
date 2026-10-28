'use server'

// FAQs: add, edit, delete and reorder through the Local API as the signed-in user (admin/editor).
import { revalidatePath } from 'next/cache'

import { BO } from '../nav'
import { actionUser, errorMessage, isSession, type ActionResult } from '../server'
import { FAQ_CATS, type FaqCat } from '../website'

type Pair = { th: string; en: string }
export type FaqInput = {
  id: number | null
  question: Pair
  answer: Pair
  category: FaqCat
  showOnHome: boolean
  order: number
}

const CONTENT = ['admin', 'editor'] as const

export async function saveFaqAction(v: FaqInput): Promise<ActionResult> {
  const s = await actionUser([...CONTENT])
  if (!isSession(s)) return s
  const { L } = s
  const qTh = v.question.th.trim() || v.question.en.trim()
  const aTh = v.answer.th.trim() || v.answer.en.trim()
  if (!qTh) return { ok: false, message: L('ใส่คำถาม', 'Enter the question') }
  if (!aTh) return { ok: false, message: L('ใส่คำตอบ', 'Enter the answer') }
  const order = Math.round(Number(v.order))
  if (!Number.isFinite(order)) return { ok: false, message: L('ลำดับไม่ถูกต้อง', 'Invalid order') }
  const category = FAQ_CATS.includes(v.category) ? v.category : 'general'
  try {
    const th = { question: qTh, answer: aTh, category, showOnHome: v.showOnHome, order }
    const doc = v.id
      ? await s.payload.update({ collection: 'faqs', id: v.id, locale: 'th', data: th, ...s.as })
      : await s.payload.create({ collection: 'faqs', locale: 'th', data: th, ...s.as })
    await s.payload.update({
      collection: 'faqs',
      id: doc.id,
      locale: 'en',
      data: { question: v.question.en.trim() || qTh, answer: v.answer.en.trim() || aTh },
      ...s.as,
    })
    revalidatePath(BO, 'layout')
    return {
      ok: true,
      id: doc.id,
      message: v.id ? L('บันทึกคำถามแล้ว', 'FAQ saved') : L('เพิ่มคำถามแล้ว', 'FAQ added'),
    }
  } catch (err) {
    return { ok: false, message: errorMessage(err, L) }
  }
}

export async function deleteFaqAction(id: number): Promise<ActionResult> {
  const s = await actionUser([...CONTENT])
  if (!isSession(s)) return s
  try {
    await s.payload.delete({ collection: 'faqs', id, ...s.as })
    revalidatePath(BO, 'layout')
    return { ok: true, message: s.L('ลบคำถามแล้ว', 'FAQ deleted') }
  } catch (err) {
    return { ok: false, message: errorMessage(err, s.L) }
  }
}

// Saves the list order as 10, 20, 30... (only rows whose number changes are written)
export async function reorderFaqsAction(
  rows: { id: number; order: number }[],
): Promise<ActionResult> {
  const s = await actionUser([...CONTENT])
  if (!isSession(s)) return s
  try {
    for (const [i, r] of rows.entries()) {
      const order = (i + 1) * 10
      if (r.order === order) continue
      await s.payload.update({ collection: 'faqs', id: r.id, data: { order }, ...s.as })
    }
    revalidatePath(BO, 'layout')
    return { ok: true, message: s.L('จัดลำดับใหม่แล้ว', 'Order saved') }
  } catch (err) {
    return { ok: false, message: errorMessage(err, s.L) }
  }
}
