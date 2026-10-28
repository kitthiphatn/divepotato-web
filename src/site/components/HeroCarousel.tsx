'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

export type HeroSlide = {
  title: string
  subtitle?: string | null
  button?: { label: string; href: string } | null
  image?: { url: string; alt: string; width?: number | null; height?: number | null } | null
}

const AUTO_MS = 6000

// Home hero: a loop of full-bleed slides. The next photo follows the finger (or mouse) while
// dragging, the loop never ends, and it moves on every 6 s except while the slider is pressed.
// Dots only. No library: pointer events and CSS transforms. With reduced motion the slides
// change without animation and don't move on their own (as in the design file).
export function HeroCarousel({
  slides,
  labels,
}: {
  slides: HeroSlide[]
  labels: { region: string; slide: string; of: string }
}) {
  const n = slides.length
  const view = useRef<HTMLDivElement>(null)
  const items = useRef<(HTMLElement | null)[]>([])
  const offsets = useRef<number[]>([])
  const pos = useRef(0)
  const timer = useRef<number | undefined>(undefined)
  const press = useRef<{ x: number; y: number; id: number; drag: boolean } | null>(null)
  const dx = useRef(0)
  const suppress = useRef(false)
  const [active, setActive] = useState(0)

  const reduced = () =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // Put every slide at its offset from the current one (-n/2 … n/2), so the loop has a
  // neighbour on both sides. A slide that wraps around jumps there without animating.
  const place = useCallback(
    (animate: boolean) => {
      const cur = ((pos.current % n) + n) % n
      const ease = animate && !reduced()
      items.current.forEach((el, k) => {
        if (!el) return
        let o = (((k - cur) % n) + n) % n
        if (o > n / 2) o -= n
        // Two slides: the other one waits on whichever side the finger is pulling from
        if (n === 2 && o !== 0) o = dx.current > 0 ? -1 : 1
        const prev = offsets.current[k]
        const jump = prev !== undefined && Math.abs(o - prev) > 1
        offsets.current[k] = o
        el.style.transition =
          ease && !jump ? 'transform .7s cubic-bezier(.2,.7,.2,1)' : 'none'
        el.style.transform = `translate3d(calc(${o * 100}% + ${dx.current}px),0,0)`
        el.setAttribute('aria-hidden', String(o !== 0))
        el.inert = o !== 0
      })
      setActive(cur)
    },
    [n],
  )

  // Autoplay: one timer at a time, restarted after every move so each slide gets the full 6 s
  const advance = useRef(() => {})
  const schedule = useCallback(() => {
    window.clearTimeout(timer.current)
    if (n < 2 || reduced() || press.current) return
    timer.current = window.setTimeout(() => advance.current(), AUTO_MS)
  }, [n])
  useEffect(() => {
    advance.current = () => {
      pos.current += 1
      dx.current = 0
      place(true)
      schedule()
    }
  }, [place, schedule])

  const goTo = useCallback(
    (next: number) => {
      pos.current = next
      dx.current = 0
      place(true)
      schedule()
    },
    [place, schedule],
  )

  useEffect(() => {
    place(false)
    schedule()
    return () => window.clearTimeout(timer.current)
  }, [place, schedule])

  // The next photos load right after the first one so a swipe never shows an empty slide
  useEffect(() => {
    const load = () =>
      view.current?.querySelectorAll('img').forEach((img) => (img.loading = 'eager'))
    if (document.readyState === 'complete') load()
    else window.addEventListener('load', load, { once: true })
    return () => window.removeEventListener('load', load)
  }, [])

  if (n === 0) return null

  const onDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || n < 2) return
    press.current = { x: e.clientX, y: e.clientY, id: e.pointerId, drag: false }
    dx.current = 0
    // Press and hold pauses the autoplay until the pointer is released
    window.clearTimeout(timer.current)
  }
  const onMove = (e: React.PointerEvent) => {
    const p = press.current
    if (!p || p.id !== e.pointerId) return
    const mx = e.clientX - p.x
    if (!p.drag && Math.abs(mx) > 8 && Math.abs(mx) > Math.abs(e.clientY - p.y)) {
      p.drag = true
      try {
        view.current?.setPointerCapture(e.pointerId)
      } catch {
        // capture can fail if the pointer already left; dragging still works
      }
      view.current?.classList.add('drag')
    }
    if (p.drag) {
      dx.current = mx
      place(false)
    }
  }
  const onUp = (e: React.PointerEvent) => {
    const p = press.current
    if (!p || p.id !== e.pointerId) return
    press.current = null
    view.current?.classList.remove('drag')
    if (p.drag) {
      suppress.current = true
      window.setTimeout(() => (suppress.current = false), 60)
      const w = view.current?.offsetWidth ?? 1
      if (Math.abs(dx.current) > Math.min(80, w * 0.15)) {
        const dir = dx.current < 0 ? 1 : -1
        // Keep the dragged offset for this frame so the slide eases on from where it was let go
        pos.current += dir
        dx.current = 0
        place(true)
        schedule()
        return
      }
    }
    dx.current = 0
    place(true)
    schedule()
  }

  return (
    <section
      className="hero"
      id="top"
      aria-roledescription="carousel"
      aria-label={labels.region}
    >
      <div
        ref={view}
        className={`view${n > 1 ? ' multi' : ''}`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onDragStart={(e) => e.preventDefault()}
        onClickCapture={(e) => {
          if (!suppress.current) return
          e.preventDefault()
          e.stopPropagation()
        }}
      >
        {slides.map((s, k) => {
          const Heading = k === 0 ? 'h1' : 'h2'
          return (
            <article
              key={k}
              ref={(el) => {
                items.current[k] = el
              }}
              className="slide"
              aria-roledescription="slide"
              aria-label={`${k + 1} ${labels.of} ${n}`}
              style={k === 0 ? undefined : { transform: `translate3d(${k > n / 2 ? (k - n) * 100 : k * 100}%,0,0)` }}
            >
              <div className="bgp">
                {s.image && (
                  <Image
                    src={s.image.url}
                    alt={s.image.alt}
                    fill
                    sizes="100vw"
                    priority={k === 0}
                    loading={k === 0 ? undefined : 'lazy'}
                    draggable={false}
                    style={{ objectFit: 'cover' }}
                  />
                )}
              </div>
              <div className="scr" />
              <div className="stx">
                <Heading className="ttl dsp">{s.title}</Heading>
                {s.subtitle && <p className="sub">{s.subtitle}</p>}
              </div>
              {s.button && (
                <div className="sct">
                  <Link className="pill y" href={s.button.href} draggable={false}>
                    {s.button.label}
                  </Link>
                </div>
              )}
            </article>
          )
        })}
      </div>
      {n > 1 && (
        <div className="dots">
          {slides.map((_, k) => (
            <button
              key={k}
              type="button"
              aria-label={`${labels.slide} ${k + 1}`}
              aria-current={k === active}
              onClick={() => {
                const cur = ((pos.current % n) + n) % n
                goTo(pos.current + (k - cur))
              }}
            />
          ))}
        </div>
      )}
    </section>
  )
}
