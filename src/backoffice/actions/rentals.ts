'use server'

// Rental items (gear hired out per day): add, edit, stock and admin-only delete, through the
// Local API as the signed-in user
import { revalidatePath } from 'next/cache'

import { BO } from '../nav'
import { actionUser, errorMessage, isSession, type ActionResult } from '../server'

export type RentalInput = {
  id: number | null
  name: { th: string; en: string }
  pricePerDay: number
  stock: number
}

const CONTENT = ['admin', 'editor'] as const
const whole = (n: number) => Math.round(Number(n))

export async function saveRentalAction(v: RentalInput): Promise<ActionResult> {
  const s = await actionUser([...CONTENT])
  if (!isSession(s)) return s
  const { L } = s
  const nameTh = v.name.th.trim() || v.name.en.trim()
  if (!nameTh) return { ok: false, message: L('ใส่ชื่ออุปกรณ์', 'Enter the item name') }
  const price = Number(v.pricePerDay)
  const stock = whole(v.stock)
  if (!Number.isFinite(price) || price < 0)
    return { ok: false, message: L('ค่าเช่าไม่ถูกต้อง', 'Invalid price') }
  if (!Number.isFinite(stock) || stock < 0 || stock > 9999)
    return { ok: false, message: L('จำนวนไม่ถูกต้อง', 'Invalid quantity') }
  try {
    const th = { name: nameTh, pricePerDay: price, stock }
    const doc = v.id
      ? await s.payload.update({
          collection: 'rental-items',
          id: v.id,
          locale: 'th',
          data: th,
          ...s.as,
        })
      : await s.payload.create({ collection: 'rental-items', locale: 'th', data: th, ...s.as })
    await s.payload.update({
      collection: 'rental-items',
      id: doc.id,
      locale: 'en',
      data: { name: v.name.en.trim() || nameTh },
      ...s.as,
    })
    revalidatePath(BO, 'layout')
    return {
      ok: true,
      id: doc.id,
      message: v.id ? L('บันทึกอุปกรณ์แล้ว', 'Item saved') : L('เพิ่มอุปกรณ์แล้ว', 'Item added'),
    }
  } catch (err) {
    return { ok: false, message: errorMessage(err, L) }
  }
}

export async function setRentalStockAction(id: number, stock: number): Promise<ActionResult> {
  const s = await actionUser([...CONTENT])
  if (!isSession(s)) return s
  const n = whole(stock)
  if (!Number.isFinite(n) || n < 0 || n > 9999)
    return { ok: false, message: s.L('จำนวนไม่ถูกต้อง', 'Invalid quantity') }
  try {
    await s.payload.update({ collection: 'rental-items', id, data: { stock: n }, ...s.as })
    revalidatePath(BO, 'layout')
    return { ok: true, message: s.L(`อัปเดตสต็อกเป็น ${n} ชิ้น`, `Stock set to ${n}`) }
  } catch (err) {
    return { ok: false, message: errorMessage(err, s.L) }
  }
}

// Same rule as products: only admins delete
export async function deleteRentalAction(id: number): Promise<ActionResult> {
  const s = await actionUser(['admin'])
  if (!isSession(s)) return s
  try {
    await s.payload.delete({ collection: 'rental-items', id, ...s.as })
    revalidatePath(BO, 'layout')
    return { ok: true, message: s.L('ลบอุปกรณ์แล้ว', 'Item deleted') }
  } catch (err) {
    return { ok: false, message: errorMessage(err, s.L) }
  }
}
