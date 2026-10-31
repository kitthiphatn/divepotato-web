'use client'

import { useEffect, useRef, useState } from 'react'

// Month chips and a sideways-scrolling rail of departure cards (rendered on the server).
// Picking a month hides the other cards; the arrows scroll the rail on desktop.
export function MonthRail({
  months,
  allLabel,
  total,
  prevLabel,
  nextLabel,
  head,
  children,
}: {
  head: React.ReactNode
  months: { key: string; label: string; count: number }[]
  allLabel: string
  total: number
  prevLabel: string
  nextLabel: string
  children: React.ReactNode
}) {
  const [month, setMonth] = useState('')
  const rail = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = rail.current
    if (!el) return
    el.querySelectorAll<HTMLElement>('[data-month]').forEach((card) => {
      card.hidden = Boolean(month) && card.dataset.month !== month
    })
    el.scrollLeft = 0
  }, [month])

  const scroll = (dir: number) => {
    const el = rail.current
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: reduce ? 'auto' : 'smooth' })
  }

  return (
    <>
      <div className="th">
        {head}
        <div className="arr">
          <button type="button" onClick={() => scroll(-1)} aria-label={prevLabel}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <button type="button" onClick={() => scroll(1)} aria-label={nextLabel}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
      {months.length > 1 && (
        <div className="chips" role="group">
          <button type="button" aria-pressed={month === ''} onClick={() => setMonth('')}>
            {allLabel}
            <sup>{total}</sup>
          </button>
          {months.map((m) => (
            <button key={m.key} type="button" aria-pressed={month === m.key} onClick={() => setMonth(m.key)}>
              {m.label}
              <sup>{m.count}</sup>
            </button>
          ))}
        </div>
      )}
      <div className="rail" ref={rail} tabIndex={0}>
        {children}
      </div>
    </>
  )
}
