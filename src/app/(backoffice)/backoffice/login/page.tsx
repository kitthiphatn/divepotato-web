import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { roleOf } from '@/access/roles'
import { translator } from '@/backoffice/i18n'
import { homeFor } from '@/backoffice/nav'
import { currentUser, getLang } from '@/backoffice/server'
import { LoginForm } from '@/backoffice/ui/LoginForm'
import { LangSeg } from '@/backoffice/ui/Shell'

export const metadata: Metadata = { title: 'เข้าสู่ระบบ · Sign in' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const [{ user }, lang, sp] = await Promise.all([currentUser(), getLang(), searchParams])
  const role = roleOf(user)
  if (user && role) redirect(homeFor(role))
  const L = translator(lang)

  return (
    <div className="login">
      <div className="lg-photo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/backoffice/login.webp"
          alt={L('นักดำน้ำกับฝูงปลา', 'Diver with a school of fish')}
        />
        <div className="lg-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/backoffice/logo.png" alt="" />
          Dive Potato
        </div>
        <div className="lg-cap">
          <h2>{L('ทุกการจอง ทุกที่นั่ง ในที่เดียว', 'Every booking, every seat, in one place')}</h2>
          <p>
            {L(
              'หลังบ้านสำหรับทีมงาน Dive Potato Scuba Diving',
              'The staff backoffice for Dive Potato Scuba Diving',
            )}
          </p>
        </div>
      </div>
      <div className="lg-form">
        <div className="lg-top">
          <LangSeg lang={lang} />
        </div>
        <LoginForm
          lang={lang}
          next={typeof sp.next === 'string' ? sp.next : ''}
          roleError={sp.error === 'role'}
        />
      </div>
    </div>
  )
}
