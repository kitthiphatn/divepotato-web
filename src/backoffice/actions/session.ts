'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { generateExpiredPayloadCookie, generatePayloadCookie } from 'payload'

import { roleOf } from '@/access/roles'

import { isLang, LANG_COOKIE, translator } from '../i18n'
import { BO, homeFor } from '../nav'
import { getLang, payloadClient } from '../server'

const YEAR = 60 * 60 * 24 * 365

export type LoginState = { error?: string } | undefined

// Signs in with Payload's own auth and sets the same `payload-token` cookie the admin uses
export async function loginAction(_prev: LoginState, form: FormData): Promise<LoginState> {
  const L = translator(await getLang())
  const email = String(form.get('email') ?? '').trim()
  const password = String(form.get('password') ?? '')
  const remember = form.get('remember') === 'on'
  const next = String(form.get('next') ?? '')
  if (!email || !password)
    return { error: L('กรอกอีเมลและรหัสผ่าน', 'Enter your email and password') }

  const payload = await payloadClient()
  let target = BO
  try {
    const res = await payload.login({ collection: 'users', data: { email, password } })
    const role = roleOf(res.user)
    if (!res.token || !role)
      return {
        error: L('บัญชีนี้ยังไม่มีสิทธิ์เข้าหลังบ้าน', 'This account has no backoffice role'),
      }
    const auth = payload.collections.users.config.auth
    const cookie = generatePayloadCookie({
      collectionAuthConfig: auth,
      cookiePrefix: payload.config.cookiePrefix,
      token: res.token,
      returnCookieAsObject: true,
    })
    ;(await cookies()).set(cookie.name, res.token, {
      httpOnly: true,
      path: cookie.path ?? '/',
      sameSite: 'lax',
      secure: Boolean(cookie.secure),
      domain: cookie.domain,
      // Unticked "keep me signed in": the cookie ends with the browser session
      expires: remember && cookie.expires ? new Date(cookie.expires) : undefined,
    })
    target = next.startsWith(`${BO}/`) && !next.startsWith(`${BO}/login`) ? next : homeFor(role)
  } catch {
    return { error: L('อีเมลหรือรหัสผ่านไม่ถูกต้อง', 'Wrong email or password') }
  }
  redirect(target)
}

export async function logoutAction() {
  const payload = await payloadClient()
  const expired = generateExpiredPayloadCookie({
    collectionAuthConfig: payload.collections.users.config.auth,
    cookiePrefix: payload.config.cookiePrefix,
    returnCookieAsObject: true,
  })
  ;(await cookies()).delete({ name: expired.name, path: expired.path ?? '/' })
  redirect(`${BO}/login`)
}

export async function setLangAction(lang: string) {
  if (!isLang(lang)) return
  ;(await cookies()).set(LANG_COOKIE, lang, { path: '/', maxAge: YEAR, sameSite: 'lax' })
  revalidatePath(BO, 'layout')
}
