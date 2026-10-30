'use client'

import { startTransition, useActionState, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { requestBooking, type BookingRequestState } from '@/site/actions/booking'

export type BookingOffering = {
  kind: 'trip' | 'course'
  title: string
  subtitle?: string | null
  price: number
  depositPct: number
  departures: { id: number; label: string; left: number; leftLabel: string }[]
}

export type BookingLabels = {
  kicker: string
  close: string
  dep: string
  people: string
  minus: string
  plus: string
  name: string
  phone: string
  email: string
  line: string
  note: string
  notePh: string
  price: string
  total: string
  deposit: string
  submit: string
  sending: string
  fine: string
  doneT: string
  doneP: string
  ref: string
  done: string
  noOpen: string
  full: string
  askLine: string
  call: string
}

export type BookingContact = { lineUrl: string | null; phoneHref: string | null }

const baht = (n: number) => `฿${Math.round(n).toLocaleString('en-US')}`

// "จอง" button: opens a booking-request sheet. Nothing is paid here (online payment is
// phase 2); the server action records the request for the team to confirm.
export function BookButton({
  offering,
  labels,
  contact,
  locale,
  children,
  className = 'pill k sm',
  departureId,
}: {
  offering: BookingOffering
  labels: BookingLabels
  contact: BookingContact
  locale: string
  children: React.ReactNode
  className?: string
  departureId?: number
}) {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  return (
    <>
      <button ref={trigger} type="button" className={className} onClick={() => setOpen(true)}>
        {children}
      </button>
      {/* Portalled to <body> so the card or sticky bar it opens from can't restyle or clip it */}
      {open &&
        createPortal(
          <BookingSheet
            offering={offering}
            labels={labels}
            contact={contact}
            locale={locale}
            departureId={departureId}
            onClose={() => {
              setOpen(false)
              trigger.current?.focus({ preventScroll: true })
            }}
          />,
          document.body,
        )}
    </>
  )
}

function BookingSheet({
  offering,
  labels: t,
  contact,
  locale,
  departureId,
  onClose,
}: {
  offering: BookingOffering
  labels: BookingLabels
  contact: BookingContact
  locale: string
  departureId?: number
  onClose: () => void
}) {
  const id = useId()
  const open = offering.departures.filter((d) => d.left > 0)
  const first = open.find((d) => d.id === departureId) ?? open[0]
  const [dep, setDep] = useState<number | null>(first?.id ?? null)
  const [pax, setPax] = useState(1)
  const [state, action, pending] = useActionState<BookingRequestState, FormData>(
    requestBooking,
    null,
  )
  const closeBtn = useRef<HTMLButtonElement>(null)
  const max = Math.min(20, offering.departures.find((d) => d.id === dep)?.left ?? 1)
  const people = Math.min(pax, Math.max(1, max))
  const total = offering.price * people
  const deposit = Math.round((total * offering.depositPct) / 100)

  useEffect(() => {
    closeBtn.current?.focus()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const done = state?.ok === true
  const err = state && !state.ok ? state : null
  const bad = (f: string) => (err?.field === f ? true : undefined)

  return (
    <div className="ov" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-t`}
        onSubmit={(e) => {
          // Sent by hand so React doesn't clear the fields when the server returns an error
          e.preventDefault()
          const data = new FormData(e.currentTarget)
          startTransition(() => action(data))
        }}
      >
        <div className="shh">
          <span className="k">{t.kicker}</span>
          <button ref={closeBtn} className="shx" type="button" onClick={onClose} aria-label={t.close}>
            ×
          </button>
        </div>
        <h3 id={`${id}-t`}>{offering.title}</h3>
        {offering.subtitle && <p className="s">{offering.subtitle}</p>}

        {done ? (
          <div className="okk" role="status">
            <div className="ck2">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </div>
            <h4>{t.doneT}</h4>
            {state.code && (
              <p>
                {t.ref} <b className="num">{state.code}</b>
              </p>
            )}
            <p>{t.doneP}</p>
            <div className="alt">
              {contact.lineUrl && (
                <a className="pill o sm" href={contact.lineUrl} target="_blank" rel="noopener noreferrer">
                  {t.askLine}
                </a>
              )}
            </div>
            <button className="pill k full" type="button" onClick={onClose}>
              {t.done}
            </button>
          </div>
        ) : open.length === 0 ? (
          <div className="okk">
            <p>{t.noOpen}</p>
            <div className="alt">
              {contact.lineUrl && (
                <a className="pill y" href={contact.lineUrl} target="_blank" rel="noopener noreferrer">
                  {t.askLine}
                </a>
              )}
              {contact.phoneHref && (
                <a className="pill o" href={contact.phoneHref}>
                  {t.call}
                </a>
              )}
            </div>
          </div>
        ) : (
          <>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="pax" value={people} />
            <div className="hp" aria-hidden="true">
              <label>
                Website
                <input type="text" name="website" tabIndex={-1} autoComplete="off" />
              </label>
            </div>

            <span className="lbl" id={`${id}-d`}>
              {t.dep}
            </span>
            <div className="dts" role="radiogroup" aria-labelledby={`${id}-d`}>
              {offering.departures.map((d) => (
                <label className="opt" key={d.id}>
                  <span>{d.label}</span>
                  <span className="r">
                    <small>{d.left > 0 ? d.leftLabel : t.full}</small>
                    <input
                      type="radio"
                      name="departure"
                      value={d.id}
                      checked={dep === d.id}
                      disabled={d.left <= 0}
                      onChange={() => setDep(d.id)}
                      required
                    />
                  </span>
                </label>
              ))}
            </div>

            <div className="ppl">
              <span>{t.people}</span>
              <div className="stepper">
                <button type="button" aria-label={t.minus} disabled={people <= 1} onClick={() => setPax(Math.max(1, people - 1))}>
                  −
                </button>
                <output aria-live="polite">{people}</output>
                <button type="button" aria-label={t.plus} disabled={people >= max} onClick={() => setPax(Math.min(max, people + 1))}>
                  +
                </button>
              </div>
            </div>

            <label className="fld">
              <span>{t.name}</span>
              <input className="inp" name="name" required minLength={2} maxLength={100} autoComplete="name" aria-invalid={bad('name')} />
            </label>
            <div className="f2">
              <label className="fld">
                <span>{t.phone}</span>
                <input className="inp" name="phone" type="tel" required inputMode="tel" maxLength={30} pattern="\+?[0-9][0-9 ()\-]{6,18}[0-9]" autoComplete="tel" aria-invalid={bad('phone')} />
              </label>
              <label className="fld">
                <span>{t.line}</span>
                <input className="inp" name="lineId" maxLength={41} autoCapitalize="off" autoCorrect="off" spellCheck={false} aria-invalid={bad('lineId')} />
              </label>
            </div>
            <label className="fld">
              <span>{t.email}</span>
              <input className="inp" name="email" type="email" maxLength={120} autoComplete="email" aria-invalid={bad('email')} />
            </label>
            <label className="fld">
              <span>{t.note}</span>
              <textarea className="inp" name="note" maxLength={1000} rows={3} placeholder={t.notePh} />
            </label>

            <dl className="sum">
              <div>
                <dt>{t.price}</dt>
                <dd className="num">{baht(offering.price)}</dd>
              </div>
              <div>
                <dt>{t.total}</dt>
                <dd className="num">{baht(total)}</dd>
              </div>
              <div>
                <dt>{t.deposit}</dt>
                <dd className="num">{baht(deposit)}</dd>
              </div>
            </dl>

            {err && (
              <p className="err" role="alert">
                {err.error}
              </p>
            )}
            <button className="pill y full" type="submit" disabled={pending || !dep}>
              {pending ? t.sending : t.submit}
            </button>
            <p className="sfine">{t.fine}</p>
          </>
        )}
      </form>
    </div>
  )
}
