import type { Metadata } from 'next'
import Link from 'next/link'

import { BALANCE_DAYS } from '@/backoffice/data'
import { Icon } from '@/backoffice/icons'
import { lexicalToText } from '@/backoffice/richtext'
import { requireUser } from '@/backoffice/server'
import { SettingsForm, type StaffRow } from '@/backoffice/ui/Settings'

export const metadata: Metadata = { title: 'ตั้งค่า · Settings' }

const ROLE_ORDER = ['admin', 'editor', 'staff', 'guide']

export default async function SettingsPage() {
  const s = await requireUser(['admin'])
  const { L } = s
  const loc = (locale: 'th' | 'en') => ({ locale, fallbackLocale: false as const, depth: 0 })
  const [th, en, users] = await Promise.all([
    s.payload.findGlobal({ slug: 'booking-settings', ...loc('th'), ...s.as }),
    s.payload.findGlobal({ slug: 'booking-settings', ...loc('en'), ...s.as }),
    s.payload.find({ collection: 'users', pagination: false, depth: 0, sort: 'name', ...s.as }),
  ])
  const staff: StaffRow[] = users.docs
    .map((u) => ({
      id: u.id,
      name: u.name ?? '',
      email: u.email,
      role: u.role,
      me: u.id === s.user.id,
    }))
    .sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role))

  return (
    <>
      <div className="ph">
        <div>
          <h1>{L('ตั้งค่า', 'Settings')}</h1>
          <p className="lede">
            {L(
              'กติกาการจอง การรับเงิน การแจ้งเตือน และทีมงาน',
              'Booking rules, payments, notifications and team',
            )}
          </p>
        </div>
        <div className="acts">
          <Link className="btn o" href="/admin">
            <Icon name="sliders" />
            {L('เปิดหลังบ้านแบบเต็ม (สำหรับผู้ดูแลระบบ)', 'Open the full admin (admins)')}
          </Link>
        </div>
      </div>
      <SettingsForm
        lang={s.lang}
        balanceDays={BALANCE_DAYS}
        staff={staff}
        value={{
          depositPct: th.depositPct ?? 30,
          holdMinutes: th.holdMinutes ?? 15,
          cancellation: {
            th: lexicalToText(th.cancellationPolicy),
            en: lexicalToText(en.cancellationPolicy),
          },
          cancellationDirty: { th: false, en: false },
          omisePublicKey: th.omisePublicKey ?? '',
          omiseSecretKey: th.omiseSecretKey ?? '',
          promptPayId: th.promptPayId ?? '',
          lineChannelToken: th.lineChannelToken ?? '',
          lineTarget: th.lineTarget ?? '',
          notifyEmail: th.notifyEmail ?? '',
        }}
      />
    </>
  )
}
