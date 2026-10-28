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

export type StaffInput = { name: string; email: string; role: string; password: string }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Admins add a team member with a temporary password (shared with them in person or on LINE)
export async function createStaffAction(v: StaffInput): Promise<ActionResult> {
  const s = await actionUser(['admin'])
  if (!isSession(s)) return s
  const { L } = s
  const name = v.name.trim()
  const email = v.email.trim().toLowerCase()
  if (!name) return { ok: false, message: L('ใส่ชื่อ', 'Enter a name') }
  if (!EMAIL_RE.test(email)) return { ok: false, message: L('อีเมลไม่ถูกต้อง', 'Invalid email') }
  if (!ROLES.includes(v.role as User['role']))
    return { ok: false, message: L('เลือกสิทธิ์', 'Pick a role') }
  if (v.password.length < 8)
    return {
      ok: false,
      message: L('รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร', 'Use at least 8 characters'),
    }
  try {
    const taken = await s.payload.count({
      collection: 'users',
      where: { email: { equals: email } },
      ...s.as,
    })
    if (taken.totalDocs)
      return { ok: false, message: L('อีเมลนี้มีบัญชีแล้ว', 'This email already has an account') }
    const u = await s.payload.create({
      collection: 'users',
      data: { name, email, role: v.role as User['role'], password: v.password },
      depth: 0,
      ...s.as,
    })
    revalidatePath(BO, 'layout')
    return {
      ok: true,
      id: u.id,
      message: L(`เพิ่ม ${name} เข้าทีมแล้ว`, `${name} added to the team`),
    }
  } catch (err) {
    return { ok: false, message: errorMessage(err, L) }
  }
}

// Admins set a new temporary password for someone who forgot theirs
export async function setPasswordAction(userId: number, password: string): Promise<ActionResult> {
  const s = await actionUser(['admin'])
  if (!isSession(s)) return s
  const { L } = s
  if (password.length < 8)
    return {
      ok: false,
      message: L('รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร', 'Use at least 8 characters'),
    }
  try {
    const u = await s.payload.update({
      collection: 'users',
      id: userId,
      data: { password },
      depth: 0,
      ...s.as,
    })
    return {
      ok: true,
      message: L(
        `ตั้งรหัสผ่านใหม่ให้ ${u.name || u.email} แล้ว`,
        `New password set for ${u.name || u.email}`,
      ),
    }
  } catch (err) {
    return { ok: false, message: errorMessage(err, L) }
  }
}
