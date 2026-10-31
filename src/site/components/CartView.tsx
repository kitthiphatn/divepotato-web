'use client'

import Link from 'next/link'
import { useEffect, useState, useSyncExternalStore } from 'react'

import { isOneSize } from '@/backoffice/shop'
import type { Locale } from '@/i18n/config'
import { quoteAction, type Quote, type QuoteLine } from '@/site/actions/shop'
import { setCartQty, useCart, type CartLine } from '@/site/cart'
import { getDict } from '@/site/i18n'
import { GearIcon } from '@/site/icons'

export const baht = (n: number) => `฿${Math.round(n).toLocaleString('en-US')}`

// Current prices and stock for the cart from the server, asked again whenever the cart changes.
// Lines the shop can no longer sell in full are trimmed to what is left.
export function useQuote(locale: Locale, lines: CartLine[]) {
  const [quote, setQuote] = useState<Quote | null>(null)
  // Quantities a line was trimmed to, kept so the note stays after the cart updates
  const [trimmed, setTrimmed] = useState<Record<number, number>>({})
  const key = lines.map((l) => `${l.variant}x${l.qty}`).join(',')
  useEffect(() => {
    let live = true
    const cart = key ? key.split(',').map((x) => x.split('x').map(Number)) : []
    quoteAction(locale, cart.map(([variant, qty]) => ({ variant, qty })))
      .then((q) => {
        if (!live) return
        setQuote(q)
        const reduced = q.lines.filter((l) => l.issue === 'reduced')
        if (!reduced.length) return
        setTrimmed((o) => ({ ...o, ...Object.fromEntries(reduced.map((l) => [l.variant, l.qty])) }))
        for (const l of reduced)
          setCartQty(l.variant, l.qty, { title: l.title, size: l.size, price: l.price })
      })
      .catch(() => null)
    return () => {
      live = false
    }
  }, [locale, key])
  return { quote, setQuote, trimmed }
}

const noop = () => () => {}
// False while rendering on the server and hydrating; the cart only exists in the browser
export const useClient = () => useSyncExternalStore(noop, () => true, () => false)

export function LineImage({ src }: { src: string | null }) {
  return (
    <span className="cim">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" />
      ) : (
        <GearIcon />
      )}
    </span>
  )
}

// /<locale>/cart: change quantities, remove lines, see the subtotal, go to checkout
export function CartView({ locale }: { locale: Locale }) {
  const t = getDict(locale)
  const c = t.cart
  const lines = useCart()
  const { quote, trimmed } = useQuote(locale, lines)
  const ready = useClient()

  const q = new Map<number, QuoteLine>((quote?.lines ?? []).map((l) => [l.variant, l]))
  const blocked = lines.some((l) => {
    const x = q.get(l.variant)
    return x?.issue === 'gone' || x?.issue === 'soldout'
  })
  const subtotal = lines.reduce((s, l) => {
    const x = q.get(l.variant)
    return x && (x.issue === 'gone' || x.issue === 'soldout') ? s : s + (x?.price ?? l.price) * l.qty
  }, 0)
  const freeMin = quote?.rules.ship && quote.rules.freeMin > 0 ? quote.rules.freeMin : 0

  if (!ready) return <p className="muted">{c.loading}</p>
  if (!lines.length)
    return (
      <div className="cempty">
        <h2>{c.empty}</h2>
        <p>{c.emptyP}</p>
        <Link className="pill k" href={`/${locale}/equipment`}>
          {c.browse}
        </Link>
      </div>
    )

  return (
    <div className="cartw">
      <ul className="clines">
        {lines.map((l) => {
          const x = q.get(l.variant)
          const out = x?.issue === 'gone' || x?.issue === 'soldout'
          const price = x?.price ?? l.price
          const max = x ? Math.max(x.available, 0) : l.qty
          return (
            <li key={l.variant} className={out ? 'out' : undefined}>
              <LineImage src={x?.image ?? l.image} />
              <div className="cl-i">
                <Link href={`/${locale}/equipment/${l.slug}`} className="cl-t">
                  {x?.title || l.title}
                </Link>
                <small>
                  {[l.size && !isOneSize(l.size) && `${c.size} ${l.size}`, baht(price)].filter(Boolean).join(' · ')}
                </small>
                {out ? (
                  <p className="cnote">{x?.issue === 'gone' ? c.gone : c.soldOut}</p>
                ) : (
                  trimmed[l.variant] !== undefined && <p className="cnote">{c.reduced(trimmed[l.variant])}</p>
                )}
                <div className="crow">
                  {!out && (
                    <div className="stepper">
                      <button
                        type="button"
                        aria-label={t.gear.minus}
                        disabled={l.qty <= 1}
                        onClick={() => setCartQty(l.variant, l.qty - 1)}
                      >
                        −
                      </button>
                      <output aria-live="polite">{l.qty}</output>
                      <button
                        type="button"
                        aria-label={t.gear.plus}
                        disabled={l.qty >= max}
                        onClick={() => setCartQty(l.variant, l.qty + 1)}
                      >
                        +
                      </button>
                    </div>
                  )}
                  <button type="button" className="ulnk" onClick={() => setCartQty(l.variant, 0)}>
                    {c.remove}
                  </button>
                </div>
              </div>
              <b className="num cprice">{out ? '–' : baht(price * l.qty)}</b>
            </li>
          )
        })}
      </ul>
      <aside className="csum">
        <dl className="sum">
          <div className="due">
            <dt>{c.subtotal}</dt>
            <dd className="num">{baht(subtotal)}</dd>
          </div>
        </dl>
        <p className="sfine">
          {c.shipNote}
          {freeMin ? ` · ${c.freeFrom(baht(freeMin))}` : ''}
        </p>
        {blocked ? (
          <button className="pill y full" type="button" disabled>
            {c.checkout}
          </button>
        ) : (
          <Link className="pill y full" href={`/${locale}/checkout`}>
            {c.checkout}
          </Link>
        )}
        <Link className="pill o full" href={`/${locale}/equipment`}>
          {c.more}
        </Link>
      </aside>
    </div>
  )
}
