'use server'

// Booking settings (deposit, seat hold, cancellation policy, payment provider and methods, bank
// account for transfers, LINE settings stored for later) and staff roles. Admin only, saved through the Local API as the signed-in admin.
import { revalidatePath } from 'next/cache'

import { PAY_METHODS, PROVIDERS, type PayMethod, type ProviderId } from '@/lib/payments/types'
import { isValidUsername, normalizeUsername, USERNAME_MAX } from '@/lib/username'
import type { User } from '@/payload-types'

import { BO } from '../nav'
import { textToLexical } from '../richtext'
import { actionUser, errorMessage, isSession, type ActionResult, type Session } from '../server'

export type SettingsInput = {
  depositPct: number
  holdMinutes: number
  cancellation: { th: string; en: string }
  cancellationDirty: { th: boolean; en: boolean }
  paymentProvider: ProviderId
  payMethods: PayMethod[]
  bankName: string
  accountName: string
  accountNumber: string
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
  if (!PROVIDERS.includes(v.paymentProvider))
    return { ok: false, message: L('เลือกผู้ให้บริการรับชำระเงิน', 'Choose a payment provider') }
  const payMethods = PAY_METHODS.filter((m) => v.payMethods.includes(m))
  if (!payMethods.length)
    return {
      ok: false,
      message: L('เปิดอย่างน้อยหนึ่งช่องทางชำระเงิน', 'Turn on at least one payment method'),
    }
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
        paymentProvider: v.paymentProvider,
        payMethods,
        bankName: opt(v.bankName),
        accountName: opt(v.accountName),
        accountNumber: opt(v.accountNumber),
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

export type StaffInput = {
  name: string
  email: string
  username: string
  role: string
  password: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Checks a username's characters and that no other account uses it; returns an error message
async function usernameProblem(s: Session, username: string, exceptId?: number) {
  const { L } = s
  if (!username) return L('ใส่ชื่อผู้ใช้', 'Enter a username')
  if (!isValidUsername(username))
    return L(
      `ชื่อผู้ใช้ใช้ได้เฉพาะ a-z พิมพ์เล็ก ตัวเลข และ . _ - (ไม่เกิน ${USERNAME_MAX} ตัว)`,
      `Usernames use lowercase a-z, 0-9 and . _ - only (up to ${USERNAME_MAX} characters)`,
    )
  const taken = await s.payload.count({
    collection: 'users',
    where: {
      username: { equals: username },
      ...(exceptId ? { id: { not_equals: exceptId } } : {}),
    },
    ...s.as,
  })
  if (taken.totalDocs) return L('ชื่อผู้ใช้นี้มีคนใช้แล้ว', 'This username is already taken')
  return null
}

// Admins add a team member with a temporary password (shared with them in person or on LINE)
export async function createStaffAction(v: StaffInput): Promise<ActionResult> {
  const s = await actionUser(['admin'])
  if (!isSession(s)) return s
  const { L } = s
  const name = v.name.trim()
  const email = v.email.trim().toLowerCase()
  const username = normalizeUsername(v.username)
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
    const problem = await usernameProblem(s, username)
    if (problem) return { ok: false, message: problem }
    const u = await s.payload.create({
      collection: 'users',
      data: { name, email, username, role: v.role as User['role'], password: v.password },
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

// Admins rename an account's username (the email stays as it is and still works to sign in)
export async function setUsernameAction(userId: number, value: string): Promise<ActionResult> {
  const s = await actionUser(['admin'])
  if (!isSession(s)) return s
  const { L } = s
  const username = normalizeUsername(value)
  try {
    const problem = await usernameProblem(s, username, userId)
    if (problem) return { ok: false, message: problem }
    const u = await s.payload.update({
      collection: 'users',
      id: userId,
      data: { username },
      depth: 0,
      ...s.as,
    })
    revalidatePath(BO, 'layout')
    return {
      ok: true,
      message: L(
        `${u.name || u.email} เข้าสู่ระบบด้วย ${u.username} ได้แล้ว`,
        `${u.name || u.email} can now sign in as ${u.username}`,
      ),
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
