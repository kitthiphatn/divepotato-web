import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { canBookings, dueOf, findBookings, findDepartures } from '@/backoffice/data'
import { fdy, money, shopTime, todayYmd } from '@/backoffice/format'
import { CERT_LABEL, DEP_STATUS_LABEL, STATUS_LABEL, VOID_STATUSES } from '@/backoffice/i18n'
import { Icon } from '@/backoffice/icons'
import { BO } from '@/backoffice/nav'
import { requireUser } from '@/backoffice/server'
import { PrintButton } from '@/backoffice/ui/PrintButton'

export const metadata: Metadata = { title: 'ใบรายชื่อ · Manifest' }

// Printable passenger manifest (A4 landscape); bilingual like the prototype
export default async function ManifestPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireUser(['admin', 'staff', 'guide'])
  const { L } = s
  const { id } = await params
  if (!/^\d+$/.test(id)) notFound()
  // Manifest content is always Thai first with English in brackets, whatever the UI language
  const [d] = await findDepartures({ ...s, lang: 'th' }, { id: { equals: Number(id) } }, 1)
  if (!d) notFound()
  const bookings = (await findBookings({ ...s, lang: 'th' }, { departure: { equals: d.id } }))
    .filter((b) => !VOID_STATUSES.includes(b.status))
    .sort((a, b) => a.code.localeCompare(b.code))
  const px = bookings.flatMap((b) => b.participants.map((p) => ({ ...p, b })))
  const site = await s.payload.findGlobal({ slug: 'site-settings', depth: 0, ...s.as })
  const phone = site.contact?.phone
  const showMoney = canBookings(s)
  const now = new Date()

  return (
    <>
      <div className="mtool">
        <Link className="back" href={`${BO}/departures/${d.id}`}>
          <Icon name="back" />
          {L('กลับไปที่รอบ', 'Back to departure')}
        </Link>
        <div style={{ display: 'flex', gap: 10 }}>
          <span className="small muted" style={{ alignSelf: 'center' }}>
            {L('พร้อมพิมพ์ขนาด A4 แนวนอน', 'Ready for A4 landscape')}
          </span>
          <PrintButton label={L('พิมพ์', 'Print')} />
        </div>
      </div>
      <div className="paperwrap">
        <article className="paper" id="manifest">
          <div className="mh">
            <div className="bn">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/backoffice/logo.png" alt="" />
              <div>
                <h2>ใบรายชื่อผู้เดินทาง · Passenger manifest</h2>
                <small>
                  Dive Potato Scuba Diving · PADI Dive Center{phone ? ` · โทร ${phone}` : ''}
                </small>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <small>
                พิมพ์เมื่อ / Printed {fdy(todayYmd(), 'th')} {shopTime(now)}
              </small>
              <br />
              <b className="num">
                #{d.id}-{d.start.replace(/-/g, '')}
              </b>
            </div>
          </div>
          <div className="minfo">
            <div>
              <span>ทริป / Trip</span>
              <b>{d.name}</b>
            </div>
            <div>
              <span>วันที่ / Date</span>
              <b>
                {fdy(d.start, 'th')}
                {d.end !== d.start ? ` – ${fdy(d.end, 'th')}` : ''}
              </b>
            </div>
            <div>
              <span>เรือ / Boat</span>
              <b>{d.boat || '—'}</b>
            </div>
            <div>
              <span>สถานะรอบ / Status</span>
              <b>{DEP_STATUS_LABEL[d.status]?.[0] ?? d.status}</b>
            </div>
            <div>
              <span>ผู้เดินทาง / Pax</span>
              <b>{px.length}</b>
            </div>
            <div>
              <span>ที่นั่ง / Capacity</span>
              <b>
                {d.booked}/{d.capacity}
              </b>
            </div>
            <div>
              <span>ฟอร์มสุขภาพ / Health forms</span>
              <b>
                {px.filter((p) => p.healthOk).length}/{px.length}
              </b>
            </div>
            <div>
              <span>ฉุกเฉิน / Emergency</span>
              <b>1669</b>
            </div>
          </div>
          {px.length === 0 ? (
            <p className="note">ยังไม่มีผู้เดินทาง · No participants yet</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>ชื่อ-สกุล / Name</th>
                  <th>สัญชาติ</th>
                  <th>ใบอนุญาต / Cert</th>
                  <th>ไซซ์ชุด</th>
                  <th>รองเท้า</th>
                  <th>อุปกรณ์เช่า / Rentals</th>
                  <th>ฟอร์มสุขภาพ</th>
                  <th>รหัสการจอง</th>
                  <th>สถานะชำระ</th>
                  <th>ลายเซ็น / Sign</th>
                </tr>
              </thead>
              <tbody>
                {px.map((p, i) => {
                  const due = showMoney ? dueOf(p.b) : 0
                  return (
                    <tr key={`${p.b.id}-${i}`}>
                      <td>{i + 1}</td>
                      <td className="nw">
                        <b>{p.name}</b>
                        {p.certNo && (
                          <>
                            <br />
                            <small>{p.certNo}</small>
                          </>
                        )}
                      </td>
                      <td>{p.b.customer?.nationality || '—'}</td>
                      <td>{CERT_LABEL[p.certLevel]?.[1] ?? p.certLevel}</td>
                      <td>{p.suitSize || '—'}</td>
                      <td>{p.shoeSize || '—'}</td>
                      <td>{p.rentals.join(', ') || '—'}</td>
                      <td>
                        {p.healthOk ? (
                          <span className="hk">✓ ครบ</span>
                        ) : (
                          <span className="hx">! ยังไม่ส่ง</span>
                        )}
                        {p.healthNotes && (
                          <>
                            <br />
                            <small>{p.healthNotes}</small>
                          </>
                        )}
                      </td>
                      <td className="nw">{p.b.code}</td>
                      <td>
                        {STATUS_LABEL[p.b.status]?.[0] ?? p.b.status}
                        {due > 0 ? ` · ค้าง ${money(due / p.b.participants.length)}` : ''}
                      </td>
                      <td className="sig" />
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
          <p className="note">
            ผู้เดินทางทุกคนต้องลงนามรับทราบความเสี่ยงก่อนลงเรือ · All divers must sign the liability
            release before boarding.
          </p>
          <div className="mf">
            <div>ไกด์ / Guide</div>
            <div>กัปตันเรือ / Captain</div>
            <div>ผู้ตรวจสอบ / Checked by</div>
          </div>
        </article>
      </div>
    </>
  )
}
