'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Dropdown } from './Dropdown'

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
        if (kind === 'course')
          return router.push(`/${locale}/courses${month ? `?month=${month}` : ''}`)
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
      <Dropdown
        label={t.month}
        value={month}
        onChange={setMonth}
        options={[
          { value: '', label: t.anyMonth },
          ...months.map((m) => ({ value: m.key, label: m.label })),
        ]}
      />
      <Dropdown
        label={t.people}
        value={pax}
        onChange={setPax}
        options={people.map((p, i) => ({ value: String(i + 1), label: p }))}
      />
      <button className="pill k" type="submit">
        {t.search}
      </button>
    </form>
  )
}
