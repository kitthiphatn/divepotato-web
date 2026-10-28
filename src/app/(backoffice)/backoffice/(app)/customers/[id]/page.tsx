import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { customerStats, findBookings } from '@/backoffice/data'
import { fdy, initials, money } from '@/backoffice/format'
import { CERT_LABEL, pair } from '@/backoffice/i18n'
import { Icon } from '@/backoffice/icons'
import { BO } from '@/backoffice/nav'
import { requireUser } from '@/backoffice/server'
import { BookingRow } from '@/backoffice/ui/Bookings'
import { CustomerNote } from '@/backoffice/ui/Customers'

export const metadata: Metadata = { title: 'ลูกค้า · Customer' }

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireUser(['admin', 'staff'])
  const { L, lang } = s
  const { id } = await params
  if (!/^\d+$/.test(id)) notFound()
  const c = await s.payload
    .findByID({ collection: 'customers', id: Number(id), depth: 0, ...s.as })
    .catch(() => null)
  if (!c) notFound()
  const st = customerStats(c.id, await findBookings(s, { customer: { equals: c.id } }))
  const since = st.first ?? c.createdAt.slice(0, 10)

  return (
    <>
      <Link className="back" href={`${BO}/customers`}>
        <Icon name="back" />
        {L('ลูกค้า', 'Customers')}
      </Link>
      <div className="ph" style={{ marginTop: 4 }}>
        <div>
          <h1>{c.name}</h1>
          <p className="lede">
            {L('ลูกค้าตั้งแต่', 'Customer since')} {fdy(since, lang)}
          </p>
        </div>
        <div className="acts">
          <button className="btn o" type="button" disabled title={L('เร็วๆ นี้', 'Coming soon')}>
            <Icon name="chat" />
            LINE
            <span className="soon">{L('เร็วๆ นี้', 'Coming soon')}</span>
          </button>
          <Link className="btn o" href={`${BO}/customers/${c.id}/edit`}>
            <Icon name="edit" />
            {L('แก้ไข', 'Edit')}
          </Link>
          <Link className="btn y" href={`${BO}/bookings?new=1&cust=${c.id}`}>
            <Icon name="plus" />
            {L('สร้างการจองใหม่', 'New booking')}
          </Link>
        </div>
      </div>
      <div className="prof">
        <section className="card pcard">
          <span className="av lg y">{initials(c.name)}</span>
          <h2>{c.name}</h2>
          <p className="muted">{c.nationality || '—'}</p>
          {st.cert && (
            <div className="cert">
              <span className="ci">PADI</span>
              <span>
                <b>{pair(lang, CERT_LABEL[st.cert], st.cert)}</b>
                <span>{L('ระดับสูงสุดจากการจอง', 'Highest level from bookings')}</span>
              </span>
            </div>
          )}
          <dl className="kv">
            <dt>{L('โทร', 'Phone')}</dt>
            <dd className="num">{c.phone || '—'}</dd>
            <dt>{L('อีเมล', 'Email')}</dt>
            <dd>{c.email || '—'}</dd>
            <dt>LINE</dt>
            <dd>{c.lineId || '—'}</dd>
            <dt>{L('ไซซ์ชุด', 'Suit size')}</dt>
            <dd>{st.suit || '—'}</dd>
          </dl>
        </section>
        <div className="grid">
          <div className="stats3">
            <div className="card">
              <span>{L('จำนวนทริป', 'Trips')}</span>
              <div className="mid num">{st.bookings.length}</div>
            </div>
            <div className="card">
              <span>{L('ยอดใช้จ่ายรวม', 'Total spent')}</span>
              <div className="mid num">{money(st.spent)}</div>
            </div>
            <div className="card">
              <span>{L('ผู้ร่วมเดินทาง', 'Travel companions')}</span>
              <div className="mid num">{st.companions}</div>
            </div>
          </div>
          <section className="card p0">
            <div style={{ padding: '22px 22px 8px' }}>
              <h3>{L('ประวัติการจอง', 'Booking history')}</h3>
            </div>
            <div className="rows hist">
              {st.bookings.map((b) => (
                <BookingRow key={b.id} b={b} lang={lang} />
              ))}
              {st.bookings.length === 0 && (
                <div className="empty">{L('ยังไม่มีการจอง', 'No bookings yet')}</div>
              )}
            </div>
          </section>
          <CustomerNote lang={lang} id={c.id} value={c.notes ?? ''} />
        </div>
      </div>
    </>
  )
}
