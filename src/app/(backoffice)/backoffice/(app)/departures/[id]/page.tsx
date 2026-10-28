import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { canBookings, findBookings, findDepartures } from '@/backoffice/data'
import { frange } from '@/backoffice/format'
import { CAT_LABEL, CERT_LABEL, DEP_STATUS_LABEL, pair, VOID_STATUSES } from '@/backoffice/i18n'
import { Icon } from '@/backoffice/icons'
import { BO } from '@/backoffice/nav'
import { requireUser } from '@/backoffice/server'
import { Img, SeatsBar, StatusPill } from '@/backoffice/ui/bits'

export const metadata: Metadata = { title: 'รอบออกเดินทาง · Departure' }

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

export default async function DeparturePage({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireUser(['admin', 'staff', 'guide'])
  const { L, lang } = s
  const { id } = await params
  if (!/^\d+$/.test(id)) notFound()
  const [d] = await findDepartures(s, { id: { equals: Number(id) } }, 1)
  if (!d) notFound()
  const bookings = (await findBookings(s, { departure: { equals: d.id } })).filter(
    (b) => !VOID_STATUSES.includes(b.status),
  )
  const staff = canBookings(s)
  const px = bookings
    .sort((a, b) => a.code.localeCompare(b.code))
    .flatMap((b) => b.participants.map((p) => ({ ...p, b })))
  const sizes: Record<string, number> = {}
  for (const p of px) if (p.suitSize) sizes[p.suitSize] = (sizes[p.suitSize] ?? 0) + 1
  const healthOk = px.filter((p) => p.healthOk).length
  const renting = px.filter((p) => p.rentals.length).length
  const year = Number(d.start.slice(0, 4)) + (lang === 'en' ? 0 : 543)

  return (
    <>
      <Link className="back" href={`${BO}/departures?month=${d.start.slice(0, 7)}`}>
        <Icon name="back" />
        {L('รอบออกเดินทาง', 'Departures')}
      </Link>
      <div className="dep-hero" style={{ marginTop: 8 }}>
        <Img src={d.photo} />
        <div className="cap">
          <div>
            <p>{pair(lang, CAT_LABEL[d.category])}</p>
            <h1>{d.name}</h1>
            <p>
              {frange(d.start, d.end, lang)} {year}
            </p>
          </div>
          <div className="acts" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {staff && (
              <Link className="btn y" href={`${BO}/bookings?new=1&dep=${d.id}`}>
                <Icon name="plus" />
                {L('เพิ่มการจอง', 'Add booking')}
              </Link>
            )}
            <Link
              className="btn"
              style={{ background: 'rgba(255,255,255,.92)', color: '#0A0A0A' }}
              href={`${BO}/departures/${d.id}/manifest`}
            >
              <Icon name="print" />
              {L('พิมพ์รายชื่อ', 'Print manifest')}
            </Link>
            {staff && (
              <Link
                className="btn"
                style={{ background: 'rgba(255,255,255,.92)', color: '#0A0A0A' }}
                href={`${BO}/departures/${d.id}/edit`}
              >
                <Icon name="edit" />
                {L('แก้ไขรอบ', 'Edit')}
              </Link>
            )}
          </div>
        </div>
      </div>
      <div className="facts">
        <div className="card">
          <span>{L('ที่นั่ง', 'Seats')}</span>
          <SeatsBar booked={d.booked} capacity={d.capacity} status={d.status} wide lang={lang} />
        </div>
        <div className="card">
          <span>{L('เรือ / สถานที่', 'Boat / venue')}</span>
          <b className="fv">{d.boat || '—'}</b>
        </div>
        <div className="card">
          <span>{L('ระยะเวลา', 'Length')}</span>
          <b className="fv">
            {d.days} {L('วัน', d.days > 1 ? 'days' : 'day')}
          </b>
        </div>
        <div className="card">
          <span>{L('สถานะรอบ', 'Status')}</span>
          <b className="fv">{pair(lang, DEP_STATUS_LABEL[d.status], d.status)}</b>
        </div>
      </div>
      {d.notes && (
        <section className="card" style={{ marginTop: 20 }}>
          <p className="sect-t">{L('บันทึก', 'Notes')}</p>
          <p style={{ whiteSpace: 'pre-line' }}>{d.notes}</p>
        </section>
      )}
      <section className="card p0" style={{ marginTop: 20 }}>
        <div style={{ padding: '22px 22px 10px' }}>
          <div className="ch" style={{ marginBottom: 10 }}>
            <h3>
              {L('ผู้เดินทาง', 'Participants')} · {px.length}
              {d.held > 0 && (
                <span className="small muted" style={{ fontWeight: 400 }}>
                  {' '}
                  + {d.held} {L('ที่นั่งจองไว้ชั่วคราว', 'seats on hold')}
                </span>
              )}
            </h3>
          </div>
          <div className="sumchips">
            <span className={`pill ${healthOk === px.length ? 'st-paid' : 'st-review'}`}>
              {L('แบบฟอร์มสุขภาพ', 'Health forms')} {healthOk}/{px.length}
            </span>
            <span className="tagc">
              {L('เช่าอุปกรณ์', 'Renting gear')} {renting} {L('คน', 'pax')}
            </span>
            {Object.keys(sizes).length > 0 && (
              <span className="tagc">
                {L('ไซซ์ชุด', 'Suits')}:{' '}
                {SIZES.filter((z) => sizes[z])
                  .map((z) => `${z}×${sizes[z]}`)
                  .join(' · ')}
              </span>
            )}
          </div>
        </div>
        <div className="rows ptab">
          <div className="row head">
            <span>#</span>
            <span>{L('ชื่อ', 'Name')}</span>
            <span>{L('ใบอนุญาต', 'Cert')}</span>
            <span>{L('ไซซ์', 'Size')}</span>
            <span className="hc">{L('เช่าอุปกรณ์', 'Rentals')}</span>
            <span>{L('สุขภาพ', 'Health')}</span>
            <span className="hc">{L('การจอง', 'Booking')}</span>
          </div>
          {px.length === 0 && (
            <div className="empty">{L('ยังไม่มีผู้จองในรอบนี้', 'No bookings yet')}</div>
          )}
          {px.map((p, i) => {
            const cells = (
              <>
                <span className="idx num">{i + 1}</span>
                <span className="who" style={{ minWidth: 0 }}>
                  <span style={{ minWidth: 0 }}>
                    <b>{p.name}</b>
                    <small>
                      {[p.b.code, p.b.customer?.nationality].filter(Boolean).join(' · ')}
                    </small>
                  </span>
                </span>
                <span className="ptags">
                  <span className="tagc">{pair(lang, CERT_LABEL[p.certLevel], p.certLevel)}</span>
                </span>
                <span className="num ptags">
                  <span className="tagc">{p.suitSize || '—'}</span>
                </span>
                <span className="hc small muted">{p.rentals.join(', ') || '—'}</span>
                <span>
                  {p.healthOk ? (
                    <span className="flag ok">
                      <Icon name="check" />
                      {L('ครบ', 'Done')}
                    </span>
                  ) : (
                    <span className="flag no">
                      <Icon name="alert" />
                      {L('ยังไม่ส่ง', 'Missing')}
                    </span>
                  )}
                </span>
                <span className="hc">
                  <StatusPill status={p.b.status} lang={lang} />
                </span>
              </>
            )
            return staff ? (
              <Link key={`${p.b.id}-${i}`} className="row" href={`${BO}/bookings?open=${p.b.id}`}>
                {cells}
              </Link>
            ) : (
              <div key={`${p.b.id}-${i}`} className="row">
                {cells}
              </div>
            )
          })}
        </div>
      </section>
    </>
  )
}
