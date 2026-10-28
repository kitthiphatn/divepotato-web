import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'
import type { AdminViewServerProps } from 'payload'

import { addDays, dayStart, shopDay } from '@/lib/dates'
import { fullness, fullnessBand } from '@/lib/fullness'

import { requireRole, templateProps } from './viewAuth'

const T = {
  th: {
    title: 'ปฏิทินรอบออกเดินทาง',
    prev: '← เดือนก่อน',
    next: 'เดือนถัดไป →',
    thisMonth: 'เดือนนี้',
    days: ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'],
    legend: ['ว่าง (<50%)', 'ครึ่งหนึ่ง (50-79%)', 'ใกล้เต็ม (80%+)', 'เต็ม', 'ปิดรับ'],
    none: 'ไม่มีรอบออกเดินทางในเดือนนี้',
  },
  en: {
    title: 'Departures calendar',
    prev: '← Previous',
    next: 'Next →',
    thisMonth: 'This month',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    legend: ['Open (<50%)', 'Half (50-79%)', 'Nearly full (80%+)', 'Full', 'Closed'],
    none: 'No departures this month',
  },
}
const BANDS = ['low', 'mid', 'high', 'full', 'closed'] as const

// A month grid of departures (/admin/departures-calendar?month=YYYY-MM), coloured by fullness
export async function DeparturesCalendar(props: AdminViewServerProps) {
  const { adminRoute } = requireRole(props, ['admin', 'staff', 'guide'])
  const { payload, i18n } = props.initPageResult.req
  const lang = i18n.language === 'en' ? 'en' : 'th'
  const t = T[lang]

  const today = shopDay(new Date())
  const raw = props.searchParams?.month
  const month = typeof raw === 'string' && /^\d{4}-\d{2}$/.test(raw) ? raw : today.slice(0, 7)
  const [y, m] = month.split('-').map(Number)
  const first = `${month}-01`
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const nextMonth = addDays(first, daysInMonth).slice(0, 7)
  const prevMonth = addDays(first, -1).slice(0, 7)
  // Monday-first grid
  const lead = (new Date(`${first}T12:00:00Z`).getUTCDay() + 6) % 7

  const { docs } = await payload.find({
    collection: 'departures',
    where: {
      and: [
        { startDate: { greater_than_equal: dayStart(first) } },
        { startDate: { less_than: dayStart(`${nextMonth}-01`) } },
      ],
    },
    sort: 'startDate',
    pagination: false,
    depth: 0,
  })
  const byDay = new Map<string, typeof docs>()
  for (const d of docs) {
    const key = shopDay(d.startDate)
    byDay.set(key, [...(byDay.get(key) ?? []), d])
  }

  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => addDays(first, i)),
  ]
  while (cells.length % 7) cells.push(null)

  const monthLabel = new Date(`${first}T12:00:00Z`).toLocaleDateString(
    lang === 'th' ? 'th-TH' : 'en-GB',
    { month: 'long', year: 'numeric', timeZone: 'UTC' },
  )
  const base = `${adminRoute}/departures-calendar`

  return (
    <DefaultTemplate {...templateProps(props)}>
      <Gutter className="dp-cal">
        <div className="dp-cal__head">
          <h1>{t.title}</h1>
          <nav className="dp-cal__nav">
            <a href={`${base}?month=${prevMonth}`}>{t.prev}</a>
            <a href={base}>{t.thisMonth}</a>
            <a href={`${base}?month=${nextMonth}`}>{t.next}</a>
          </nav>
        </div>
        <h2 className="dp-cal__month">{monthLabel}</h2>
        <ul className="dp-cal__legend">
          {BANDS.map((b, i) => (
            <li key={b}>
              <span className={`dp-swatch dp-band--${b}`} /> {t.legend[i]}
            </li>
          ))}
        </ul>
        {docs.length === 0 && <p className="dp-muted">{t.none}</p>}
        <div className="dp-cal__grid" role="grid">
          {t.days.map((d) => (
            <div key={d} className="dp-cal__dow" role="columnheader">
              {d}
            </div>
          ))}
          {cells.map((day, i) => (
            <div
              key={day ?? `blank-${i}`}
              role="gridcell"
              className={`dp-cal__cell${day ? '' : ' dp-cal__cell--blank'}${day === today ? ' dp-cal__cell--today' : ''}`}
            >
              {day && <span className="dp-cal__date">{Number(day.slice(8))}</span>}
              {day &&
                (byDay.get(day) ?? []).map((d) => {
                  const ratio = fullness(d.seatsBooked, d.capacity)
                  return (
                    <a
                      key={d.id}
                      href={`${adminRoute}/collections/departures/${d.id}`}
                      className={`dp-cal__event dp-band--${fullnessBand(ratio, d.status)}`}
                      title={d.title ?? ''}
                    >
                      <span className="dp-cal__event-title">{d.title?.split(' · ')[0]}</span>
                      <span className="dp-cal__event-seats">
                        {d.seatsBooked ?? 0}/{d.capacity}
                      </span>
                    </a>
                  )
                })}
            </div>
          ))}
        </div>
      </Gutter>
    </DefaultTemplate>
  )
}
