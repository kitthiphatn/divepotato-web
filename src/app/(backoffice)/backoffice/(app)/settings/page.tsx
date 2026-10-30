import type { Metadata } from 'next'

import { BALANCE_DAYS } from '@/backoffice/data'
import { isProvider, keyStatus, webhookUrls } from '@/lib/payments/config'
import { PAY_METHODS } from '@/lib/payments/types'
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
      username: u.username ?? '',
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
      </div>
      <SettingsForm
        lang={s.lang}
        balanceDays={BALANCE_DAYS}
        staff={staff}
        payKeys={keyStatus()}
        webhooks={webhookUrls()}
        value={{
          depositPct: th.depositPct ?? 30,
          holdMinutes: th.holdMinutes ?? 15,
          cancellation: {
            th: lexicalToText(th.cancellationPolicy),
            en: lexicalToText(en.cancellationPolicy),
          },
          cancellationDirty: { th: false, en: false },
          paymentProvider: isProvider(th.paymentProvider) ? th.paymentProvider : 'demo',
          payMethods: th.payMethods?.length ? th.payMethods : [...PAY_METHODS],
          bankName: th.bankName ?? '',
          accountName: th.accountName ?? '',
          accountNumber: th.accountNumber ?? '',
          lineChannelToken: th.lineChannelToken ?? '',
          lineTarget: th.lineTarget ?? '',
          notifyEmail: th.notifyEmail ?? '',
        }}
      />
    </>
  )
}
