'use server'

// Customer profile and staff notes, saved through the Local API as the signed-in user.
import { revalidatePath } from 'next/cache'

import { BO } from '../nav'
import { actionUser, errorMessage, isSession, type ActionResult } from '../server'

export type CustomerInput = {
  id: number | null
  name: string
  email: string
  phone: string
  lineId: string
  nationality: string
  notes: string
}

const opt = (v: string) => v.trim() || null

export async function saveCustomerAction(v: CustomerInput): Promise<ActionResult> {
  const s = await actionUser(['admin', 'staff'])
  if (!isSession(s)) return s
  const { L } = s
  const name = v.name.trim()
  if (!name) return { ok: false, message: L('ใส่ชื่อลูกค้า', 'Enter the customer name') }
  const email = v.email.trim()
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { ok: false, message: L('อีเมลไม่ถูกต้อง', 'Invalid email') }
  const data = {
    name,
    email: email || null,
    phone: opt(v.phone),
    lineId: opt(v.lineId),
    nationality: opt(v.nationality),
    notes: opt(v.notes),
  }
  try {
    const doc = v.id
      ? await s.payload.update({ collection: 'customers', id: v.id, data, ...s.as })
      : await s.payload.create({ collection: 'customers', data, ...s.as })
    revalidatePath(BO, 'layout')
    return {
      ok: true,
      id: doc.id,
      redirect: `${BO}/customers/${doc.id}`,
      message: v.id
        ? L('บันทึกข้อมูลลูกค้าแล้ว', 'Customer saved')
        : L('เพิ่มลูกค้าแล้ว', 'Customer added'),
    }
  } catch (err) {
    return { ok: false, message: errorMessage(err, L) }
  }
}

export async function saveCustomerNoteAction(id: number, notes: string): Promise<ActionResult> {
  const s = await actionUser(['admin', 'staff'])
  if (!isSession(s)) return s
  try {
    await s.payload.update({
      collection: 'customers',
      id,
      data: { notes: notes.trim() || null },
      ...s.as,
    })
    revalidatePath(BO, 'layout')
    return { ok: true, message: s.L('บันทึกโน้ตแล้ว', 'Note saved') }
  } catch (err) {
    return { ok: false, message: errorMessage(err, s.L) }
  }
}
