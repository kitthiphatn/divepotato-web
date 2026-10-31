'use client'

import Link from 'next/link'
import { useId, useState } from 'react'

import { isOneSize } from '@/backoffice/shop'
import type { Locale } from '@/i18n/config'
import { shippingFee } from '@/lib/shop'
import { placeOrderAction } from '@/site/actions/shop'
import { clearCart, useCart } from '@/site/cart'
import { getDict } from '@/site/i18n'

import { baht, LineImage, useClient, useQuote } from './CartView'

type Delivery = 'pickup' | 'ship'

// /<locale>/checkout: contact details, pickup or post, and the summary the server will charge.
// Placing the order reserves the items and moves on to the pay page.
export function Checkout({ locale }: { locale: Locale }) {
  const t = getDict(locale)
  const k = t.checkout
  const id = useId()
  const lines = useCart()
  const ready = useClient()
  const { quote, setQuote } = useQuote(locale, lines)
  const [delivery, setDelivery] = useState<Delivery | null>(null)
  const [f, setF] = useState({ name: '', phone: '', email: '', line: '', district: '', province: '', postcode: '', website: '' })
  const [err, setErr] = useState<{ error: string; field?: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const rules = quote?.rules
  const options: Delivery[] = rules ? (['pickup', 'ship'] as const).filter((d) => rules[d]) : []
  const chosen: Delivery | null = delivery && options.includes(delivery) ? delivery : (options[0] ?? null)
  const sellable = (quote?.lines ?? []).filter((l) => l.qty > 0)
  const subtotal = quote?.subtotal ?? 0
  const fee = rules && chosen ? shippingFee(subtotal, chosen, rules) : 0
  const total = subtotal + fee
  const problem = quote?.lines.some((l) => l.issue)
  const field = (name: keyof typeof f) => ({
    value: f[name],
    onChange: (e: { target: { value: string } }) => setF((o) => ({ ...o, [name]: e.target.value })),
    'aria-invalid': err?.field === name || undefined,
  })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chosen || !quote) return
    setErr(null)
    setBusy(true)
    const r = await placeOrderAction({
      locale,
      name: f.name,
      phone: f.phone,
      email: f.email,
      delivery: chosen,
      address: { line: f.line, district: f.district, province: f.province, postcode: f.postcode },
      cart: lines.map((l) => ({ variant: l.variant, qty: l.qty })),
      total,
      website: f.website,
    }).catch(() => null)
    if (r?.ok) {
      clearCart()
      window.location.assign(r.payUrl)
      return
    }
    setBusy(false)
    if (!r) return setErr({ error: k.errors.server })
    if (r.quote) setQuote(r.quote)
    setErr({ error: r.error, field: r.field })
  }

  if (!ready || (lines.length && !quote)) return <p className="muted">{t.cart.loading}</p>
  if (!lines.length)
    return (
      <div className="cempty">
        <h2>{t.cart.empty}</h2>
        <Link className="pill k" href={`/${locale}/equipment`}>
          {t.cart.browse}
        </Link>
      </div>
    )

  return (
    <form className="payw cow" onSubmit={submit} noValidate>
      <div className="payh">
        <span className="eb">{k.eb}</span>
        <h1 className="dsp">{k.title}</h1>
      </div>

      <aside className="paysum">
        <h2 className="sumh">{k.summary}</h2>
        <ul className="olist">
          {sellable.map((l) => (
            <li key={l.variant}>
              <LineImage src={l.image} />
              <span>
                <b>{l.title}</b>
                <small>{[!isOneSize(l.size) && l.size, `× ${l.qty}`].filter(Boolean).join(' · ')}</small>
              </span>
              <span className="num">{baht(l.price * l.qty)}</span>
            </li>
          ))}
        </ul>
        <dl className="sum">
          <div>
            <dt>{k.subtotal}</dt>
            <dd className="num">{baht(subtotal)}</dd>
          </div>
          {chosen === 'ship' && (
            <div>
              <dt>{k.shipping}</dt>
              <dd className="num">{fee ? baht(fee) : k.free}</dd>
            </div>
          )}
          <div className="due">
            <dt>{k.total}</dt>
            <dd className="num">{baht(total)}</dd>
          </div>
        </dl>
        {rules?.ship && rules.freeMin > 0 && chosen === 'ship' && fee > 0 && (
          <p className="sfine">{t.cart.freeFrom(baht(rules.freeMin))}</p>
        )}
        <Link className="ulnk sback" href={`/${locale}/cart`}>
          {k.backCart}
        </Link>
      </aside>

      <div className="paymain">
        {problem && (
          <p className="err" role="alert">
            {k.errors.stock}{' '}
            <Link className="ulnk" href={`/${locale}/cart`}>
              {k.backCart}
            </Link>
          </p>
        )}
        <h2 className="sumh">{k.contact}</h2>
        <div className="hp" aria-hidden="true">
          <label>
            Website
            <input type="text" tabIndex={-1} autoComplete="off" {...field('website')} />
          </label>
        </div>
        <label className="fld">
          <span>{k.name}</span>
          <input className="inp" required maxLength={100} autoComplete="name" {...field('name')} />
        </label>
        <div className="f2">
          <label className="fld">
            <span>{k.phone}</span>
            <input className="inp" type="tel" required inputMode="tel" maxLength={30} autoComplete="tel" {...field('phone')} />
          </label>
          <label className="fld">
            <span>{k.email}</span>
            <input className="inp" type="email" maxLength={120} autoComplete="email" {...field('email')} />
          </label>
        </div>

        <span className="lbl" id={`${id}-d`}>
          {k.delivery}
        </span>
        {options.length === 0 ? (
          <p className="hint">{k.noDelivery}</p>
        ) : (
          <div className="dts" role="radiogroup" aria-labelledby={`${id}-d`}>
            {options.map((d) => {
              const dFee = rules ? shippingFee(subtotal, d, rules) : 0
              return (
                <label className="opt" key={d}>
                  <span>
                    {d === 'pickup' ? k.pickup : k.ship}
                    <br />
                    <small>{d === 'pickup' ? k.pickupP : dFee ? baht(dFee) : k.free}</small>
                  </span>
                  <input
                    type="radio"
                    name="delivery"
                    value={d}
                    checked={chosen === d}
                    onChange={() => setDelivery(d)}
                  />
                </label>
              )
            })}
          </div>
        )}

        {chosen === 'ship' && (
          <>
            <label className="fld">
              <span>{k.address}</span>
              <textarea className="inp" rows={2} maxLength={300} autoComplete="street-address" {...field('line')} />
            </label>
            <div className="f2">
              <label className="fld">
                <span>{k.district}</span>
                <input className="inp" maxLength={80} autoComplete="address-level2" {...field('district')} />
              </label>
              <label className="fld">
                <span>{k.province}</span>
                <input className="inp" maxLength={80} autoComplete="address-level1" {...field('province')} />
              </label>
            </div>
            <label className="fld">
              <span>{k.postcode}</span>
              <input
                className="inp num"
                inputMode="numeric"
                maxLength={5}
                autoComplete="postal-code"
                {...field('postcode')}
              />
            </label>
          </>
        )}

        {err && (
          <p className="err" role="alert">
            {err.error}
          </p>
        )}
        <button className="pill y full cbtn" type="submit" disabled={busy || !chosen || problem || !sellable.length}>
          {busy ? k.placing : `${k.place} · ${baht(total)}`}
        </button>
        {quote && <p className="sfine">{k.holdNote(quote.holdMinutes)}</p>}
      </div>
    </form>
  )
}
