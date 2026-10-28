'use client'

import { useActionState, useState } from 'react'

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
  const [forgot, setForgot] = useState(false)
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
          'ยินดีต้อนรับกลับ ใช้ชื่อผู้ใช้หรืออีเมลของร้านเพื่อเข้าใช้งาน',
          'Welcome back. Sign in with your username or shop email.',
        )}
      </p>
      <input type="hidden" name="next" value={next} />
      <label className="field">
        <span>{L('ชื่อผู้ใช้หรืออีเมล', 'Username or email')}</span>
        <input
          className="inp"
          type="text"
          name="login"
          defaultValue={state?.login ?? ''}
          placeholder={L('เช่น noi หรือ noi@divepotato.co', 'e.g. noi or noi@divepotato.co')}
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
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
        <button
          type="button"
          className="lg-forgot"
          aria-expanded={forgot}
          onClick={() => setForgot((f) => !f)}
        >
          {L('ลืมรหัสผ่าน?', 'Forgot password?')}
        </button>
      </div>
      {forgot && (
        <p className="lg-help" role="note" style={{ marginTop: 12 }}>
          {L(
            'ติดต่อผู้ดูแลระบบของร้าน ให้ตั้งรหัสผ่านชั่วคราวใหม่ได้ที่ ตั้งค่า › ทีมงานและสิทธิ์',
            'Ask the shop admin to set a temporary password in Settings › Staff & roles.',
          )}
        </p>
      )}
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
          'ใช้บัญชีทีมงานของร้าน สิทธิ์ของบัญชีกำหนดเมนูที่เห็น',
          'Use your shop team account; your role decides which menus you see.',
        )}
      </p>
    </form>
  )
}
