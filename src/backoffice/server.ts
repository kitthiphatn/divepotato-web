// Server-side helpers for the backoffice: Payload client, signed-in user, language and theme.
// Every page and server action goes through `requireUser`, and passes the user with
// `overrideAccess: false` to the Local API so the collection access rules apply.
import config from '@payload-config'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

import { roleOf, type Role } from '@/access/roles'
import type { User } from '@/payload-types'

import { isLang, LANG_COOKIE, THEME_COOKIE, translator, type Lang } from './i18n'
import { BO, homeFor } from './nav'

export const payloadClient = () => getPayload({ config })

export async function getLang(): Promise<Lang> {
  const v = (await cookies()).get(LANG_COOKIE)?.value
  return isLang(v) ? v : 'th'
}

export async function getTheme(): Promise<'light' | 'dark' | null> {
  const v = (await cookies()).get(THEME_COOKIE)?.value
  return v === 'light' || v === 'dark' ? v : null
}

export async function currentUser() {
  const payload = await payloadClient()
  const { user } = await payload.auth({ headers: await headers() })
  return { payload, user: (user as User | null) ?? null }
}

export type Session = {
  payload: Awaited<ReturnType<typeof payloadClient>>
  user: User
  role: Role
  lang: Lang
  L: ReturnType<typeof translator>
  // Local API options that apply the signed-in user's access rules
  as: { user: User; overrideAccess: false }
}

// For pages: redirect to the login page when signed out, and to the role's home page when the
// role can't use this screen
export async function requireUser(roles?: Role[]): Promise<Session> {
  const { payload, user } = await currentUser()
  if (!user) redirect(`${BO}/login`)
  const role = roleOf(user)
  if (!role) redirect(`${BO}/login?error=role`)
  if (roles && !roles.includes(role)) redirect(homeFor(role))
  const lang = await getLang()
  return { payload, user, role, lang, L: translator(lang), as: { user, overrideAccess: false } }
}

export type ActionResult = { ok: boolean; message: string; id?: number | string; redirect?: string }

// For server actions: same check, but returns an error instead of redirecting
export async function actionUser(roles?: Role[]): Promise<Session | ActionResult> {
  const { payload, user } = await currentUser()
  const lang = await getLang()
  const L = translator(lang)
  if (!user) return { ok: false, message: L('กรุณาเข้าสู่ระบบอีกครั้ง', 'Please sign in again') }
  const role = roleOf(user)
  if (!role || (roles && !roles.includes(role)))
    return { ok: false, message: L('บัญชีนี้ไม่มีสิทธิ์ทำรายการนี้', 'Your role cannot do this') }
  return { payload, user, role, lang, L, as: { user, overrideAccess: false } }
}

export const isSession = (s: Session | ActionResult): s is Session => 'payload' in s

// For route handlers (exports): same check, but answers 401 when signed out and 403 when the
// role can't use the screen, instead of redirecting
export async function routeUser(roles?: Role[]): Promise<Session | Response> {
  const { payload, user } = await currentUser()
  if (!user) return new Response('Unauthorized', { status: 401 })
  const role = roleOf(user)
  if (!role || (roles && !roles.includes(role))) return new Response('Forbidden', { status: 403 })
  const lang = await getLang()
  return { payload, user, role, lang, L: translator(lang), as: { user, overrideAccess: false } }
}

// A readable message from a Payload error (validation, access)
export function errorMessage(err: unknown, L: ReturnType<typeof translator>) {
  const e = err as {
    status?: number
    message?: string
    data?: { errors?: { message?: string; path?: string }[] }
  }
  if (e?.status === 403) return L('บัญชีนี้ไม่มีสิทธิ์ทำรายการนี้', 'Your role cannot do this')
  const first = e?.data?.errors?.[0]
  if (first?.message) return `${first.path ? `${first.path}: ` : ''}${first.message}`
  return e?.message || L('บันทึกไม่สำเร็จ ลองอีกครั้ง', 'Could not save, please try again')
}
