'use server'

// Stock per size. Only the stock number changes here; products and variants are added in /admin.
import { revalidatePath } from 'next/cache'

import { BO } from '../nav'
import { actionUser, errorMessage, isSession, type ActionResult } from '../server'

export async function setStockAction(variantId: number, stock: number): Promise<ActionResult> {
  const s = await actionUser(['admin', 'editor'])
  if (!isSession(s)) return s
  const n = Math.round(Number(stock))
  if (!Number.isFinite(n) || n < 0 || n > 9999)
    return { ok: false, message: s.L('จำนวนไม่ถูกต้อง', 'Invalid quantity') }
  try {
    await s.payload.update({
      collection: 'product-variants',
      id: variantId,
      data: { stock: n },
      ...s.as,
    })
    revalidatePath(BO, 'layout')
    return { ok: true, message: s.L(`อัปเดตสต็อกเป็น ${n} ชิ้น`, `Stock set to ${n}`) }
  } catch (err) {
    return { ok: false, message: errorMessage(err, s.L) }
  }
}
