import type { Metadata } from 'next'
import Link from 'next/link'

import { findDepartures, type DepartureVM } from '@/backoffice/data'
import {
  addDays,
  DOW_EN,
  DOW_TH,
  monthLabel,
  monthShort,
  frange,
  todayYmd,
} from '@/backoffice/format'
import { Icon } from '@/backoffice/icons'
import { BO } from '@/backoffice/nav'
import { requireUser } from '@/backoffice/server'
import { fillClass, Img, SeatsBar } from '@/backoffice/ui/bits'
import type { Lang } from '@/backoffice/i18n'

export const metadata: Metadata = { title: 'รอบออกเดินทาง · Departures' }

function DepRow({ d, lang }: { d: DepartureVM; lang: Lang }) {
  const day = Number(d.start.slice(8))
  const m = Number(d.start.slice(5, 7)) - 1
  return (
    <Link className="drow" href={`${BO}/departures/${d.id}`}>
      <span className="datebox">
        <b className="num">{day}</b>
        <span>{monthShort(m, lang)}</span>
      </span>
      <Img src={d.photo} />
      <span style={{ minWidth: 0 }}>
        <h4>{d.name}</h4>
        <p>{[frange(d.start, d.end, lang), d.boat].filter(Boolean).join(' · ')}</p>
      </span>
      <span className="sb">
        <SeatsBar booked={d.booked} capacity={d.capacity} status={d.status} wide lang={lang} />
      </span>
      <span className="chev muted">
        <Icon name="chev" />
      </span>
    </Link>
  )
}

export default async function DeparturesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; view?: string }>
}) {
  const s = await requireUser(['admin', 'staff', 'guide'])
  const { L, lang } = s
  const sp = await searchParams
  const today = todayYmd()
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? '') ? sp.month! : today.slice(0, 7)
  const view = sp.view === 'list' ? 'list' : 'cal'
  const first = `${month}-01`
  const [y, mo] = month.split('-').map(Number)
  const daysInMonth = new Date(Date.UTC(y, mo, 0)).getUTCDate()
  const nextMonth = addDays(first, daysInMonth).slice(0, 7)
  const prevMonth = addDays(first, -1).slice(0, 7)
  // Sunday-first grid as in the prototype
  const lead = new Date(`${first}T12:00:00Z`).getUTCDay()
  const gridStart = addDays(first, -lead)
  const weeks = Math.ceil((lead + daysInMonth) / 7)
  const cells = Array.from({ length: weeks * 7 }, (_, i) => addDays(gridStart, i))

  // Anything that starts in the visible grid, plus trips that started up to a month before
  const deps = await findDepartures(s, {
    and: [
      { startDate: { greater_than_equal: `${addDays(gridStart, -31)}T00:00:00+07:00` } },
      { startDate: { less_than: `${addDays(cells[cells.length - 1], 1)}T00:00:00+07:00` } },
    ],
  })
  const monthDeps = deps.filter((d) => d.start.startsWith(month))
  const href = (p: { month?: string; view?: string }) => {
    const q = new URLSearchParams({ month: p.month ?? month, view: p.view ?? view })
    return `${BO}/departures?${q}`
  }
  const short = (d: DepartureVM) => d.name.replace(/^PADI\s+/, '')

  const cal = (
    <>
      <div className="card p0">
        <div className="cal">
          {(lang === 'en' ? DOW_EN : DOW_TH).map((x) => (
            <div key={x} className="dow">
              {x}
            </div>
          ))}
          {cells.map((c) => {
            const evs = deps.filter((d) => d.start === c)
            const cont = deps.filter((d) => d.start < c && d.end >= c)
            return (
              <div
                key={c}
                className={`d${c.startsWith(month) ? '' : ' out'}${c === today ? ' today' : ''}`}
              >
                <span className="n num">{Number(c.slice(8))}</span>
                <div className="evs">
                  {evs.map((d) => (
                    <Link
                      key={d.id}
                      className={`ev ${fillClass(d.booked, d.capacity, d.status)}`}
                      href={`${BO}/departures/${d.id}`}
                      title={d.name}
                    >
                      <b>{short(d)}</b>
                      <span className="num">
                        {d.booked}/{d.capacity} {L('ที่', 'seats')}
                        {d.days > 1 ? ` · ${d.days}${L(' วัน', 'd')}` : ''}
                      </span>
                    </Link>
                  ))}
                  {cont.map((d) => (
                    <Link
                      key={`c${d.id}`}
                      className={`ev cont ${fillClass(d.booked, d.capacity, d.status)}`}
                      href={`${BO}/departures/${d.id}`}
                    >
                      <b>↳ {short(d)}</b>
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div className="mlist dlist">
        <p className="sect-t">
          {L('รอบในเดือนนี้', 'This month')} · {monthDeps.length}
        </p>
        {monthDeps.map((d) => (
          <DepRow key={d.id} d={d} lang={lang} />
        ))}
      </div>
    </>
  )

  const list = (
    <div className="dlist">
      {monthDeps.map((d) => (
        <DepRow key={d.id} d={d} lang={lang} />
      ))}
      {monthDeps.length === 0 && (
        <div className="card empty">{L('ไม่มีรอบในเดือนนี้', 'No departures this month')}</div>
      )}
    </div>
  )

  return (
    <>
      <div className="ph">
        <div>
          <h1>{L('รอบออกเดินทาง', 'Departures')}</h1>
          <p className="lede">
            {L(
              'แตะรอบเพื่อดูรายชื่อและพิมพ์ใบรายชื่อ',
              'Tap a departure to see participants and print the manifest',
            )}
          </p>
        </div>
        {s.role === 'admin' && (
          <div className="acts">
            <Link className="btn y" href={`${BO}/departures/new`}>
              <Icon name="plus" />
              {L('เพิ่มรอบใหม่', 'New departure')}
            </Link>
          </div>
        )}
      </div>
      <div className="calhd">
        <Link
          className="ibtn"
          href={href({ month: prevMonth })}
          aria-label={L('เดือนก่อน', 'Previous month')}
        >
          <Icon name="back" />
        </Link>
        <h3>{monthLabel(month, lang)}</h3>
        <Link
          className="ibtn"
          href={href({ month: nextMonth })}
          aria-label={L('เดือนถัดไป', 'Next month')}
        >
          <Icon name="chev" />
        </Link>
        <div className="seg" style={{ marginLeft: 8 }}>
          <Link href={href({ view: 'cal' })} aria-pressed={view === 'cal'} role="button">
            <Icon name="cal" />
            {L('ปฏิทิน', 'Calendar')}
          </Link>
          <Link href={href({ view: 'list' })} aria-pressed={view === 'list'} role="button">
            <Icon name="list" />
            {L('รายการ', 'List')}
          </Link>
        </div>
        <div className="legend">
          <span>
            <i style={{ background: 'var(--grn)' }} />
            {L('ว่าง', 'Open')}
          </span>
          <span>
            <i style={{ background: '#F5A524' }} />
            {L('ใกล้เต็ม', 'Filling')}
          </span>
          <span>
            <i style={{ background: 'var(--red)' }} />
            {L('เต็ม', 'Full')}
          </span>
        </div>
      </div>
      {view === 'cal' ? cal : list}
    </>
  )
}
