import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import {
  BALANCE_DAYS,
  canBookings,
  dueOf,
  findBookings,
  findDepartures,
  type BookingVM,
  type DepartureVM,
} from '@/backoffice/data'
import {
  addDays,
  diffDays,
  fd,
  initials,
  longDate,
  money,
  monthFull,
  nowMs,
  shopHour,
  todayYmd,
  ymd,
} from '@/backoffice/format'
import { VOID_STATUSES } from '@/backoffice/i18n'
import { Icon } from '@/backoffice/icons'
import { BO } from '@/backoffice/nav'
import { requireUser } from '@/backoffice/server'
import { Img, SeatsBar } from '@/backoffice/ui/bits'

export const metadata: Metadata = { title: 'วันนี้ · Today' }

type Todo = {
  key: string
  icon: string
  title: string
  sub: string
  action?: { label: string; href: string }
}

export default async function TodayPage() {
  const s = await requireUser(['admin', 'staff', 'guide'])
  const { L, lang, role } = s
  if (role === 'editor') redirect(`${BO}/trips`)
  const today = todayYmd()
  const tomorrow = addDays(today, 1)
  const in14 = addDays(today, 14)
  const staff = canBookings(s)

  const deps = await findDepartures(s, {
    and: [
      { startDate: { greater_than_equal: `${today}T00:00:00+07:00` } },
      { startDate: { less_than: `${addDays(in14, 1)}T00:00:00+07:00` } },
    ],
  })
  const bookings = await findBookings(s)
  const byDep = new Map<number, BookingVM[]>()
  for (const b of bookings) {
    if (!b.departure || VOID_STATUSES.includes(b.status)) continue
    byDep.set(b.departure.id, [...(byDep.get(b.departure.id) ?? []), b])
  }

  const soon = deps.filter((d) => d.start === today || d.start === tomorrow)
  const next2w = deps.filter((d) => d.start > tomorrow).slice(0, 3)
  const todays = deps.filter((d) => d.start === today).length

  const reviews = bookings.filter((b) => b.status === 'pending_review')
  const pendingAmount = (b: BookingVM) =>
    b.payments.find((p) => p.status === 'pending')?.amount ?? b.deposit
  const balDue = (b: BookingVM) => (b.departure ? addDays(b.departure.start, -BALANCE_DAYS) : today)
  const dueList = bookings.filter(
    (b) => b.status === 'deposit_paid' && balDue(b) <= addDays(today, 7) && dueOf(b) > 0,
  )
  const dueSum = dueList.reduce((sum, b) => sum + dueOf(b), 0)
  const newB = bookings.filter((b) => {
    const d = diffDays(b.created, today)
    return d >= 0 && d <= 7
  })
  const month = today.slice(0, 7)
  let revenue = 0
  let deposits = 0
  let payCount = 0
  for (const b of bookings)
    for (const p of b.payments) {
      if (p.status !== 'succeeded' || ymd(p.at).slice(0, 7) !== month) continue
      payCount++
      if (p.kind === 'refund') revenue -= p.amount
      else revenue += p.amount
      if (p.kind === 'deposit') deposits += p.amount
    }

  // To-do list, built from what needs a person right now
  const todos: Todo[] = []
  const depName = (d: DepartureVM | null) => (d ? `${d.name} ${fd(d.start, lang)}` : '')
  const openB = (b: BookingVM) => `${BO}/bookings?open=${b.id}`
  if (staff) {
    for (const b of reviews)
      todos.push({
        key: `r${b.id}`,
        icon: 'slip',
        title: L(
          `ตรวจสลิป ${b.code} · ${b.customer?.name ?? ''}`,
          `Review slip ${b.code} · ${b.customer?.name ?? ''}`,
        ),
        sub: `${depName(b.departure)} · ${L('มัดจำ ', 'deposit ')}${money(pendingAmount(b))}`,
        action: { label: L('ตรวจ', 'Review'), href: openB(b) },
      })
    for (const b of dueList) {
      const late = diffDays(balDue(b), today)
      todos.push({
        key: `d${b.id}`,
        icon: 'wallet',
        title: L(
          `ทวงยอดคงเหลือ ${b.customer?.name ?? ''} (${b.participants.length} คน)`,
          `Chase balance · ${b.customer?.name ?? ''} (${b.participants.length} pax)`,
        ),
        sub:
          (late > 0
            ? L(`เลยกำหนด ${late} วัน`, `${late} days overdue`)
            : late === 0
              ? L('ครบกำหนดวันนี้', 'Due today')
              : L(`ครบกำหนดใน ${-late} วัน`, `Due in ${-late} days`)) +
          ` · ${L('คงเหลือ ', 'balance ')}${money(dueOf(b))}`,
        action: { label: L('รับชำระ', 'Collect'), href: openB(b) },
      })
    }
  }
  for (const d of deps) {
    const missing = (byDep.get(d.id) ?? []).reduce(
      (n, b) => n + b.participants.filter((p) => !p.healthOk).length,
      0,
    )
    if (missing)
      todos.push({
        key: `h${d.id}`,
        icon: 'heart',
        title: L(
          `แบบฟอร์มสุขภาพยังไม่ครบ ${missing} คน`,
          `${missing} health form${missing > 1 ? 's' : ''} missing`,
        ),
        sub: depName(d),
        action: { label: L('ดูรอบ', 'View'), href: `${BO}/departures/${d.id}` },
      })
  }
  if (staff) {
    const now = nowMs()
    for (const b of bookings.filter((x) => x.status === 'hold')) {
      const left = b.holdExpiresAt ? Math.round((Date.parse(b.holdExpiresAt) - now) / 60000) : null
      todos.push({
        key: `o${b.id}`,
        icon: 'clock',
        title:
          left === null
            ? L('ที่นั่งจองไว้รอชำระมัดจำ', 'Seats on hold, waiting for deposit')
            : left > 0
              ? L(`ที่นั่งจองไว้จะหมดเวลาใน ${left} นาที`, `Seat hold expires in ${left} minutes`)
              : L('ที่นั่งจองไว้หมดเวลาแล้ว', 'Seat hold has expired'),
        sub: `${b.code} · ${b.customer?.name ?? ''} · ${b.departure?.name ?? ''}`,
        action: { label: L('ดู', 'Open'), href: openB(b) },
      })
    }
  }
  if (role === 'admin') {
    const variants = await s.payload.find({
      collection: 'product-variants',
      where: { stock: { less_than_equal: 2 } },
      pagination: false,
      depth: 1,
      locale: lang,
      ...s.as,
    })
    const byProduct = new Map<string, { low: string[]; out: string[] }>()
    for (const v of variants.docs) {
      const name = typeof v.product === 'object' && v.product ? v.product.title : v.sku
      const e = byProduct.get(name) ?? { low: [], out: [] }
      ;(v.stock > 0 ? e.low : e.out).push(v.size || v.sku)
      byProduct.set(name, e)
    }
    for (const [name, e] of byProduct)
      todos.push({
        key: `s${name}`,
        icon: 'bag',
        title: e.low.length
          ? L(
              `สต็อกใกล้หมด: ${name} ไซซ์ ${e.low.join(', ')}`,
              `Low stock: ${name} ${e.low.join(', ')}`,
            )
          : L(`สินค้าหมด: ${name}`, `Out of stock: ${name}`),
        sub: e.out.length
          ? L(`ไซซ์ ${e.out.join(', ')} หมดแล้ว`, `${e.out.join(', ')} out of stock`)
          : L('เหลือไม่เกิน 2 ชิ้น', '2 or fewer left'),
        action: { label: L('ดูสต็อก', 'View stock'), href: `${BO}/shop` },
      })
  }

  const hour = shopHour()
  const hello =
    hour < 12
      ? L('สวัสดีตอนเช้า', 'Good morning')
      : hour < 17
        ? L('สวัสดีตอนบ่าย', 'Good afternoon')
        : L('สวัสดีตอนเย็น', 'Good evening')
  const first = (s.user.name || s.user.email).split(/[\s@]/)[0]

  return (
    <>
      <div className="ph">
        <div>
          <span className="eb">{longDate(today, lang)}</span>
          <h1>{L(`${hello} คุณ${first}`, `${hello}, ${first}`)}</h1>
          <p className="lede">
            {staff
              ? L(
                  `วันนี้มี ${todays} รอบออกเดินทาง และสลิปรอตรวจ ${reviews.length} ใบ`,
                  `${todays} departure${todays === 1 ? '' : 's'} today and ${reviews.length} slip${reviews.length === 1 ? '' : 's'} to review`,
                )
              : L(
                  `วันนี้มี ${todays} รอบออกเดินทาง`,
                  `${todays} departure${todays === 1 ? '' : 's'} today`,
                )}
          </p>
        </div>
      </div>

      <div className="tiles">
        <section className="card tile dep" style={staff ? undefined : { gridColumn: '1 / -1' }}>
          <div className="ch" style={{ marginBottom: 4 }}>
            <h3>{L('ออกเดินทางวันนี้และพรุ่งนี้', 'Leaving today & tomorrow')}</h3>
            <Link className="link" href={`${BO}/departures`}>
              {L('ดูทั้งหมด', 'See all')}
              <Icon name="chev" />
            </Link>
          </div>
          {soon.length === 0 && (
            <p className="muted small" style={{ padding: '14px 0' }}>
              {L('วันนี้และพรุ่งนี้ไม่มีรอบออกเดินทาง', 'No departures today or tomorrow')}
            </p>
          )}
          {soon.map((d) => (
            <Link key={d.id} className="deprow" href={`${BO}/departures/${d.id}`}>
              <Img src={d.photo} />
              <span style={{ minWidth: 0 }}>
                <span className="when">
                  <span className={`daytag${d.start === today ? '' : ' tm'}`}>
                    {d.start === today ? L('วันนี้', 'Today') : L('พรุ่งนี้', 'Tomorrow')}
                  </span>
                  {[d.boat, d.days > 1 ? L(`${d.days} วัน`, `${d.days} days`) : '']
                    .filter(Boolean)
                    .join(' · ')}
                </span>
                <span className="nm">{d.name}</span>
                <SeatsBar
                  booked={d.booked}
                  capacity={d.capacity}
                  status={d.status}
                  wide
                  lang={lang}
                />
              </span>
              <span className="muted">
                <Icon name="chev" />
              </span>
            </Link>
          ))}
          <div className="foot nextw">
            <p className="sect-t">{L('ถัดไปใน 2 สัปดาห์', 'Next 2 weeks')}</p>
            {next2w.length === 0 && (
              <p className="muted small">{L('ยังไม่มีรอบ', 'Nothing scheduled')}</p>
            )}
            {next2w.map((d) => (
              <Link key={d.id} className="nxl" href={`${BO}/departures/${d.id}`}>
                <span className="num muted">{fd(d.start, lang)}</span>
                <span className="n">{d.name}</span>
                <span className="num small muted">
                  {d.booked}/{d.capacity}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {staff && (
          <>
            <section className="card tile slipt">
              <div className="tl">
                <span className="ic y">
                  <Icon name="slip" />
                </span>
                {L('สลิปรอตรวจ', 'Slips to review')}
              </div>
              <div className="sliprow">
                <div>
                  <div className="big num">{reviews.length}</div>
                  <p className="muted small">
                    {L('ยอดรวม ', 'Total ')}
                    {money(reviews.reduce((sum, b) => sum + pendingAmount(b), 0))} ·{' '}
                    {L('ลูกค้ารอการยืนยัน', 'customers waiting')}
                  </p>
                </div>
                <ul className="slipq">
                  {reviews.slice(0, 3).map((b) => (
                    <li key={b.id}>
                      <span className="av">{initials(b.customer?.name)}</span>
                      <span className="n">{b.customer?.name}</span>
                      <b className="num">{money(pendingAmount(b))}</b>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="foot">
                <Link className="btn y full" href={`${BO}/bookings?status=review`}>
                  {L('ตรวจสลิปเลย', 'Review slips')}
                  <Icon name="chev" />
                </Link>
              </div>
            </section>
            <section className="card tile sm">
              <div className="tl">
                <span className="ic">
                  <Icon name="wallet" />
                </span>
                {L('ยอดค้างชำระ 7 วัน', 'Balances due, 7 days')}
              </div>
              <div className="mid num">{money(dueSum)}</div>
              <p className="muted small">
                {L(`${dueList.length} การจอง`, `From ${dueList.length} bookings`)}
              </p>
              <div className="foot">
                <Link className="link" href={`${BO}/bookings?status=deposit`}>
                  {L('ดูรายการ', 'View')}
                  <Icon name="chev" />
                </Link>
              </div>
            </section>
            <section className="card tile sm">
              <div className="tl">
                <span className="ic">
                  <Icon name="ticket" />
                </span>
                {L('การจองใหม่ 7 วัน', 'New bookings, 7 days')}
              </div>
              <div className="mid num">{newB.length}</div>
              <p className="muted small">
                {newB.reduce((n, b) => n + b.participants.length, 0)} {L('ที่นั่ง', 'seats')}
              </p>
              <div className="foot">
                <Link className="link" href={`${BO}/bookings`}>
                  {L('ดูการจอง', 'View bookings')}
                  <Icon name="chev" />
                </Link>
              </div>
            </section>
          </>
        )}
      </div>

      <div className="row2" style={staff ? undefined : { gridTemplateColumns: 'minmax(0,1fr)' }}>
        <section className="card">
          <div className="ch">
            <div>
              <h3>{L('สิ่งที่ต้องทำ', 'To do')}</h3>
              <p>
                {staff
                  ? L(
                      'แตะปุ่มด้านขวาเพื่อจัดการได้ทันที',
                      'Tap the button on the right to handle it',
                    )
                  : L('สิ่งที่ต้องเตรียมก่อนออกเดินทาง', 'Things to prepare before departure')}
              </p>
            </div>
            <span className="pill st-y nodot num">
              {todos.length} {L('รายการ', 'left')}
            </span>
          </div>
          {todos.length === 0 ? (
            <p className="muted" style={{ padding: '14px 0' }}>
              {L('ไม่มีงานค้าง เยี่ยมมาก', 'Nothing left to do. Nice work.')}
            </p>
          ) : (
            <ul className="todo">
              {todos.map((t) => (
                <li key={t.key}>
                  <span className="dot">
                    <Icon name={t.icon} />
                  </span>
                  <span className="tx">
                    <b>{t.title}</b>
                    <span>{t.sub}</span>
                  </span>
                  {t.action && (
                    <Link className="btn o sm" href={t.action.href}>
                      {t.action.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
        {staff && (
          <section className="card tile sm rev">
            <div className="tl">
              <span className="ic">
                <Icon name="sparkle" />
              </span>
              {L(
                `รายรับเดือน${monthFull(Number(month.slice(5)) - 1, 'th')}`,
                `Revenue in ${monthFull(Number(month.slice(5)) - 1, 'en')}`,
              )}
            </div>
            <div className="mid num">{money(revenue)}</div>
            <p className="muted small">
              {L('มัดจำ ', 'Deposits ')}
              {money(deposits)}
            </p>
            <div
              className="meter"
              title={revenue > 0 ? `${Math.round((deposits / revenue) * 100)}%` : ''}
            >
              <i
                style={{
                  width: `${revenue > 0 ? Math.min(100, Math.round((deposits / revenue) * 100)) : 0}%`,
                }}
              />
            </div>
            <p className="muted small" style={{ marginTop: 6 }}>
              {L(
                `จาก ${payCount} รายการชำระเงินที่ยืนยันแล้ว`,
                `From ${payCount} confirmed payments`,
              )}
            </p>
          </section>
        )}
      </div>
    </>
  )
}
