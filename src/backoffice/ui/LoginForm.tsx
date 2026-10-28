'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import { loginAction, type LoginState } from '../actions/session'
import { translator, type Lang } from '../i18n'

export function LoginForm({
  lang,
  next,
  roleError,
}: {
  lang: Lang
  next: string
  roleError: boolean
}) {
  const L = translator(lang)
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, undefined)
  const error =
    state?.error ??
    (roleError
      ? L('บัญชีนี้ยังไม่มีสิทธิ์เข้าหลังบ้าน', 'This account has no backoffice role')
      : '')

  return (
    <form action={action} noValidate>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="logo" src="/backoffice/logo.png" alt="" />
      <h1>{L('เข้าสู่ระบบ', 'Sign in')}</h1>
      <p className="sub">
        {L(
          'ยินดีต้อนรับกลับ ใช้อีเมลของร้านเพื่อเข้าใช้งาน',
          'Welcome back. Use your shop email to sign in.',
        )}
      </p>
      <input type="hidden" name="next" value={next} />
      <label className="field">
        <span>{L('อีเมล', 'Email')}</span>
        <input
          className="inp"
          type="email"
          name="email"
          placeholder="name@divepotato.co"
          autoComplete="username"
          required
        />
      </label>
      <label className="field">
        <span>{L('รหัสผ่าน', 'Password')}</span>
        <input
          className="inp"
          type="password"
          name="password"
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />
      </label>
      <div className="lg-row">
        <label>
          <input type="checkbox" name="remember" defaultChecked />{' '}
          {L('จดจำฉันไว้', 'Keep me signed in')}
        </label>
        <Link href="/admin/forgot">{L('ลืมรหัสผ่าน?', 'Forgot password?')}</Link>
      </div>
      {error && (
        <p className="err" role="alert">
          {error}
        </p>
      )}
      <button className="btn y lg full" style={{ marginTop: 24 }} type="submit" disabled={pending}>
        {pending ? L('กำลังเข้าสู่ระบบ…', 'Signing in…') : L('เข้าสู่ระบบ', 'Sign in')}
      </button>
      <p className="lg-help">
        {L(
          'ใช้บัญชีเดียวกับหลังบ้าน Payload (/admin) สิทธิ์ของบัญชีกำหนดเมนูที่เห็น',
          'Uses the same accounts as the Payload admin (/admin); your role decides which menus you see.',
        )}
      </p>
    </form>
  )
}
