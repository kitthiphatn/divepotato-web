'use server'

// Booking settings (deposit, seat hold, cancellation policy, Omise/LINE keys stored for P2) and
// staff roles. Admin only, saved through the Local API as the signed-in admin.
import { revalidatePath } from 'next/cache'

import type { User } from '@/payload-types'

import { BO } from '../nav'
import { textToLexical } from '../richtext'
import { actionUser, errorMessage, isSession, type ActionResult } from '../server'

export type SettingsInput = {
  depositPct: number
  holdMinutes: number
  cancellation: { th: string; en: string }
  cancellationDirty: { th: boolean; en: boolean }
  omisePublicKey: string
  omiseSecretKey: string
  promptPayId: string
  lineChannelToken: string
  lineTarget: string
  notifyEmail: string
}

const opt = (v: string) => v.trim() || null

export async function saveSettingsAction(v: SettingsInput): Promise<ActionResult> {
  const s = await actionUser(['admin'])
  if (!isSession(s)) return s
  const { L } = s
  const depositPct = Math.round(Number(v.depositPct))
  const holdMinutes = Math.round(Number(v.holdMinutes))
  if (!(depositPct >= 0 && depositPct <= 100))
    return { ok: false, message: L('มัดจำต้องอยู่ระหว่าง 0-100%', 'Deposit must be 0-100%') }
  if (!(holdMinutes >= 1 && holdMinutes <= 1440))
    return {
      ok: false,
      message: L('เวลาจองที่นั่งต้องอยู่ระหว่าง 1-1440 นาที', 'Seat hold must be 1-1440 minutes'),
    }
  const email = v.notifyEmail.trim()
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { ok: false, message: L('อีเมลแจ้งเตือนไม่ถูกต้อง', 'Invalid notification email') }
  const policy = (locale: 'th' | 'en') =>
    v.cancellationDirty[locale] ? { cancellationPolicy: textToLexical(v.cancellation[locale]) } : {}
  try {
    await s.payload.updateGlobal({
      slug: 'booking-settings',
      locale: 'th',
      depth: 0,
      data: {
        depositPct,
        holdMinutes,
        ...policy('th'),
        omisePublicKey: opt(v.omisePublicKey),
        omiseSecretKey: opt(v.omiseSecretKey),
        promptPayId: opt(v.promptPayId),
        lineChannelToken: opt(v.lineChannelToken),
        lineTarget: opt(v.lineTarget),
        notifyEmail: email || null,
      },
      ...s.as,
    })
    if (v.cancellationDirty.en)
      await s.payload.updateGlobal({
        slug: 'booking-settings',
        locale: 'en',
        depth: 0,
        data: policy('en'),
        ...s.as,
      })
    revalidatePath(BO, 'layout')
    return { ok: true, message: L('บันทึกการตั้งค่าแล้ว', 'Settings saved') }
  } catch (err) {
    return { ok: false, message: errorMessage(err, L) }
  }
}

const ROLES: User['role'][] = ['admin', 'editor', 'staff', 'guide']

export async function setRoleAction(userId: number, role: string): Promise<ActionResult> {
  const s = await actionUser(['admin'])
  if (!isSession(s)) return s
  const { L } = s
  if (!ROLES.includes(role as User['role']))
    return { ok: false, message: L('สิทธิ์ไม่ถูกต้อง', 'Invalid role') }
  if (userId === s.user.id)
    return {
      ok: false,
      message: L('เปลี่ยนสิทธิ์ของตัวเองไม่ได้', "You can't change your own role"),
    }
  try {
    const u = await s.payload.update({
      collection: 'users',
      id: userId,
      data: { role: role as User['role'] },
      depth: 0,
      ...s.as,
    })
    revalidatePath(BO, 'layout')
    return {
      ok: true,
      message: L(
        `เปลี่ยนสิทธิ์ของ ${u.name || u.email} แล้ว`,
        `Role updated for ${u.name || u.email}`,
      ),
    }
  } catch (err) {
    return { ok: false, message: errorMessage(err, L) }
  }
}
