import type { Metadata } from 'next'
import type { Where } from 'payload'

import { BO } from '@/backoffice/nav'
import { requireUser } from '@/backoffice/server'
import { SubTabs } from '@/backoffice/ui/fields'
import { PaymentsList, type PaymentRow } from '@/backoffice/ui/Payments'
import type { Booking, Customer, Media, User } from '@/payload-types'

export const metadata: Metadata = { title: 'การชำระเงิน · Payments' }

const STATUSES = ['pending', 'succeeded', 'failed', 'rejected']
const PROVIDERS = ['omise', 'stripe', 'demo', 'slip', 'cash', 'transfer']
const PER_PAGE = 30

// /backoffice/bookings/payments: every payment record (staff and admin, as the Payments
// collection allows), filtered by status and provider, newest first
export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const s = await requireUser(['admin', 'staff'])
  const { L } = s
  const sp = await searchParams
  const status = STATUSES.includes(sp.status ?? '') ? sp.status! : ''
  const provider = PROVIDERS.includes(sp.provider ?? '') ? sp.provider! : ''
  const page = Math.max(1, Number(sp.page) || 1)
  const and: Where[] = []
  if (status) and.push({ status: { equals: status } })
  if (provider) and.push({ provider: { equals: provider } })

  const [res, counts] = await Promise.all([
    s.payload.find({
      collection: 'payments',
      where: and.length ? { and } : undefined,
      sort: '-createdAt',
      limit: PER_PAGE,
      page,
      depth: 2,
      locale: s.lang,
      ...s.as,
    }),
    Promise.all(
      STATUSES.map((st) =>
        s.payload
          .count({
            collection: 'payments',
            where: {
              and: [
                { status: { equals: st } },
                ...(provider ? [{ provider: { equals: provider } }] : []),
              ],
            },
            ...s.as,
          })
          .then((c) => [st, c.totalDocs] as const),
      ),
    ),
  ])

  const rows: PaymentRow[] = res.docs.map((p) => {
    const b = typeof p.booking === 'object' ? (p.booking as Booking) : null
    const c = b && typeof b.customer === 'object' ? (b.customer as Customer) : null
    const slip = typeof p.slip === 'object' ? (p.slip as Media | null) : null
    const by = typeof p.reviewedBy === 'object' ? (p.reviewedBy as User | null) : null
    return {
      id: p.id,
      bookingId: b?.id ?? (typeof p.booking === 'number' ? p.booking : null),
      code: b?.code ?? '',
      customer: c?.name ?? '',
      kind: p.kind,
      provider: p.provider,
      method: p.method ?? '',
      slipCheck: p.slipCheck ?? '',
      amount: p.amount ?? 0,
      status: p.status,
      ref: p.ref ?? '',
      slip: slip?.url ? { url: slip.url, alt: slip.alt ?? '' } : null,
      at: p.createdAt,
      reviewedBy: by ? by.name || by.email : '',
      reviewedAt: p.reviewedAt ?? null,
    }
  })

  return (
    <>
      <div className="ph">
        <div>
          <h1>{L('การจอง', 'Bookings')}</h1>
          <p className="lede">
            {L(
              'รายการรับเงินและคืนเงินทั้งหมด ดูสลิปและเปิดการจองได้',
              'Every payment and refund; view the slip or open the booking',
            )}
          </p>
        </div>
      </div>
      <SubTabs
        items={[
          { href: `${BO}/bookings`, label: L('การจอง', 'Bookings'), icon: 'ticket', on: false },
          {
            href: `${BO}/bookings/payments`,
            label: L('การชำระเงิน', 'Payments'),
            icon: 'wallet',
            on: true,
          },
        ]}
      />
      <PaymentsList
        lang={s.lang}
        rows={rows}
        status={status}
        provider={provider}
        counts={Object.fromEntries(counts)}
        page={res.page ?? 1}
        pages={res.totalPages}
        total={res.totalDocs}
      />
    </>
  )
}
