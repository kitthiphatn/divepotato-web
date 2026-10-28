'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Labels = {
  label: string
  kind: string
  courses: string
  trips: string
  funDive: string
  month: string
  anyMonth: string
  people: string
  search: string
}

// Quick search under the hero: courses go to /courses, trips (or day-trip "Fun Dive") to the
// trips page filtered by month and group size
export function QuickSearch({
  locale,
  labels: t,
  months,
  people,
}: {
  locale: string
  labels: Labels
  months: { key: string; label: string }[]
  people: string[]
}) {
  const router = useRouter()
  const [kind, setKind] = useState<'course' | 'trip' | 'fun'>('trip')
  const [month, setMonth] = useState('')
  const [pax, setPax] = useState('1')
  return (
    <form
      className="qbf"
      aria-label={t.label}
      onSubmit={(e) => {
        e.preventDefault()
        if (kind === 'course') return router.push(`/${locale}/courses${month ? `?month=${month}` : ''}`)
        const q = new URLSearchParams()
        if (kind === 'fun') q.set('type', 'daytrip')
        if (month) q.set('month', month)
        if (pax !== '1') q.set('pax', pax)
        const s = q.toString()
        router.push(`/${locale}/trips${s ? `?${s}` : ''}#schedule`)
      }}
    >
      <div className="seg" role="group" aria-label={t.kind}>
        {(
          [
            ['course', t.courses],
            ['trip', t.trips],
            ['fun', t.funDive],
          ] as const
        ).map(([k, label]) => (
          <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}>
            {label}
          </button>
        ))}
      </div>
      <label className="qf">
        <span>{t.month}</span>
        <select value={month} onChange={(e) => setMonth(e.target.value)}>
          <option value="">{t.anyMonth}</option>
          {months.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>
      </label>
      <label className="qf">
        <span>{t.people}</span>
        <select value={pax} onChange={(e) => setPax(e.target.value)}>
          {people.map((p, i) => (
            <option key={p} value={String(i + 1)}>
              {p}
            </option>
          ))}
        </select>
      </label>
      <button className="pill k" type="submit">
        {t.search}
      </button>
    </form>
  )
}
