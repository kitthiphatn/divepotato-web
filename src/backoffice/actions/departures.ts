'use server'

import { revalidatePath } from 'next/cache'

import { BO } from '../nav'
import { actionUser, errorMessage, isSession, type ActionResult } from '../server'

export type DepartureInput = {
  id?: number
  kind: 'trip' | 'course'
  offeringId: number
  start: string
  end: string
  capacity: number
  boat: string
  status: 'open' | 'full' | 'closed'
  notes: string
}

const isDay = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v)
// Dates are stored as 09:00 shop time, like the seed and the public site expect
const at9 = (v: string) => new Date(`${v}T09:00:00+07:00`).toISOString()

// Admins create departures; admins and staff edit them (the collection's access rules)
export async function saveDepartureAction(input: DepartureInput): Promise<ActionResult> {
  const s = await actionUser(input.id ? ['admin', 'staff'] : ['admin'])
  if (!isSession(s)) return s
  const { L } = s
  if (!input.offeringId)
    return { ok: false, message: L('เลือกทริปหรือคอร์ส', 'Choose a trip or course') }
  if (!isDay(input.start)) return { ok: false, message: L('ใส่วันเริ่ม', 'Enter a start date') }
  const end = isDay(input.end) && input.end >= input.start ? input.end : input.start
  const capacity = Math.round(Number(input.capacity))
  if (!(capacity >= 1))
    return { ok: false, message: L('ที่นั่งต้องมีอย่างน้อย 1', 'Capacity must be at least 1') }
  const data = {
    kind: input.kind,
    trip: input.kind === 'trip' ? input.offeringId : null,
    course: input.kind === 'course' ? input.offeringId : null,
    startDate: at9(input.start),
    endDate: at9(end),
    capacity,
    boat: input.boat.trim(),
    status: input.status,
    notes: input.notes.trim(),
  }
  try {
    const doc = input.id
      ? await s.payload.update({ collection: 'departures', id: input.id, data, ...s.as })
      : await s.payload.create({ collection: 'departures', data, ...s.as })
    revalidatePath(BO, 'layout')
    return {
      ok: true,
      id: doc.id,
      message: input.id
        ? L('บันทึกรอบแล้ว', 'Departure saved')
        : L('เพิ่มรอบใหม่แล้ว', 'Departure added'),
      redirect: `${BO}/departures/${doc.id}`,
    }
  } catch (err) {
    return { ok: false, message: errorMessage(err, L) }
  }
}
