'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { isWithinWindow } from '@/site/consent'

export type PopupSlide = { src: string; mobileSrc?: string | null; alt: string; link?: string | null }

type Props = {
  slides: PopupSlide[]
  version: string
  frequency: 'day' | 'session'
  startsAt?: string | null
  endsAt?: string | null
  autoplaySeconds?: number | null
  framed?: boolean
  labels: { close: string; goTo: string; title: string }
}

const STORAGE_KEY = 'dp_popup_seen'
const DAY = 24 * 60 * 60 * 1000

function alreadySeen(version: string, frequency: Props['frequency']) {
  try {
    const store = frequency === 'session' ? sessionStorage : localStorage
    const raw = store.getItem(STORAGE_KEY)
    if (!raw) return false
    const seen = JSON.parse(raw) as { version: string; at: number }
    if (seen.version !== version) return false
    return frequency === 'session' || Date.now() - seen.at < DAY
  } catch {
    return false
  }
}

function markSeen(version: string, frequency: Props['frequency']) {
  try {
    const store = frequency === 'session' ? sessionStorage : localStorage
    store.setItem(STORAGE_KEY, JSON.stringify({ version, at: Date.now() }))
  } catch {
    // Storage blocked (private mode): the popup may show again, which is harmless
  }
}

// Popup global: image slides shown once a day (or once per visit) per visitor. Editing the
// slides changes `version`, so everyone sees the new popup.
export function PopupSlides({
  slides,
  version,
  frequency,
  startsAt,
  endsAt,
  autoplaySeconds,
  framed = true,
  labels,
}: Props) {
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const drag = useRef<{ id: number; x: number; moved: boolean } | null>(null)
  const track = useRef<HTMLDivElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const suppress = useRef(false)
  const count = slides.length

  useEffect(() => {
    if (!isWithinWindow(startsAt, endsAt) || alreadySeen(version, frequency)) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seen-state is in browser storage
    setOpen(true)
  }, [version, frequency, startsAt, endsAt])

  const close = useCallback(() => {
    markSeen(version, frequency)
    setOpen(false)
  }, [version, frequency])

  const go = useCallback((n: number) => setIndex(((n % count) + count) % count), [count])

  useEffect(() => {
    if (!open) return
    box.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowLeft') go(index - 1)
      if (e.key === 'ArrowRight') go(index + 1)
    }
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = overflow
      window.removeEventListener('keydown', onKey)
    }
  }, [open, index, go, close])

  useEffect(() => {
    if (!open || paused || count < 2 || !autoplaySeconds) return
    const t = window.setTimeout(() => go(index + 1), Math.max(2, autoplaySeconds) * 1000)
    return () => window.clearTimeout(t)
  }, [open, paused, count, autoplaySeconds, index, go])

  if (!open || count === 0) return null

  const setDrag = (dx: number | null) => {
    const el = track.current
    if (!el) return
    el.style.transition = dx === null ? '' : 'none'
    el.style.transform = `translate3d(calc(${-index * 100}% + ${dx ?? 0}px),0,0)`
  }

  return (
    <div className="pop" onClick={close}>
      <div
        ref={box}
        className="popb"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={labels.title}
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onPointerDown={(e) => {
          if (count < 2 || e.button !== 0 || (e.target as HTMLElement).closest('button')) return
          drag.current = { id: e.pointerId, x: e.clientX, moved: false }
        }}
        onPointerMove={(e) => {
          const d = drag.current
          if (!d || d.id !== e.pointerId) return
          const dx = e.clientX - d.x
          if (!d.moved && Math.abs(dx) > 6) {
            d.moved = true
            setPaused(true)
            e.currentTarget.setPointerCapture(e.pointerId)
          }
          if (d.moved) setDrag(dx)
        }}
        onPointerUp={(e) => {
          const d = drag.current
          drag.current = null
          if (!d || !d.moved) return
          if (e.pointerType !== 'mouse') setPaused(false)
          suppress.current = true
          const dx = e.clientX - d.x
          const w = e.currentTarget.getBoundingClientRect().width
          if (track.current) track.current.style.transition = ''
          if (Math.abs(dx) > Math.min(60, w * 0.15)) go(index + (dx < 0 ? 1 : -1))
          else setDrag(null)
        }}
        onPointerCancel={() => {
          drag.current = null
          setPaused(false)
          setDrag(null)
        }}
        onDragStart={(e) => e.preventDefault()}
        onClickCapture={(e) => {
          if (!suppress.current) return
          suppress.current = false
          e.preventDefault()
          e.stopPropagation()
        }}
      >
        <div className={`popf${framed ? ' fr' : ''}`}>
          <div className="popv">
            <div
              ref={track}
              className="poptr"
              style={{ transform: `translate3d(${-index * 100}%,0,0)` }}
            >
              {slides.map((s, i) => {
                const img = (
                  <picture>
                    {s.mobileSrc && <source media="(max-width: 639px)" srcSet={s.mobileSrc} />}
                    <img
                      src={s.src}
                      alt={s.alt}
                      className={s.mobileSrc ? 'cv' : undefined}
                      draggable={false}
                      loading="eager"
                      decoding="async"
                    />
                  </picture>
                )
                return (
                  <div key={i} aria-hidden={i !== index}>
                    {s.link ? (
                      <a
                        href={s.link}
                        onClick={() => markSeen(version, frequency)}
                        tabIndex={i === index ? 0 : -1}
                      >
                        {img}
                      </a>
                    ) : (
                      img
                    )}
                  </div>
                )
              })}
            </div>
            <button type="button" className="popx" onClick={close} aria-label={labels.close}>
              ×
            </button>
          </div>
          {count > 1 && (
            <div className="popd">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`${labels.goTo} ${i + 1}`}
                  aria-current={i === index}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
