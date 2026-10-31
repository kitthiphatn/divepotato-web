'use client'

import Link from 'next/link'
import { useEffect, useId, useState } from 'react'

import { isOneSize } from '@/backoffice/shop'
import type { Locale } from '@/i18n/config'
import { stockAction } from '@/site/actions/shop'
import { addToCart, useCart } from '@/site/cart'
import { getDict } from '@/site/i18n'

type Size = { id: number; size: string; price: number; stock: number }

type Props = {
  locale: Locale
  product: { slug: string; title: string; image: string | null }
  sizes: Size[]
  lineUrl: string | null
}

const baht = (n: number) => `฿${Math.round(n).toLocaleString('en-US')}`

// Size → quantity → add to cart. The page itself is cached, so the stock left (minus what open
// orders hold) is asked from the server when the page opens; sold-out sizes can't be picked and
// the quantity never goes past what is left, counting what is already in the cart.
export function AddToCart({ locale, product, sizes, lineUrl }: Props) {
  const t = getDict(locale)
  const g = t.gear
  const id = useId()
  const cart = useCart()
  const [left, setLeft] = useState<Record<number, number>>(() =>
    Object.fromEntries(sizes.map((s) => [s.id, s.stock])),
  )
  const [pick, setPick] = useState<number | null>(sizes.length === 1 ? sizes[0].id : null)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    let live = true
    stockAction(sizes.map((s) => s.id))
      .then((r) => live && setLeft((o) => ({ ...o, ...r })))
      .catch(() => null)
    return () => {
      live = false
    }
  }, [sizes])

  const inCart = (vid: number) => cart.find((l) => l.variant === vid)?.qty ?? 0
  const room = (vid: number) => Math.max(0, (left[vid] ?? 0) - inCart(vid))
  const chosen = sizes.find((s) => s.id === pick) ?? null
  const max = chosen ? room(chosen.id) : 0
  const n = Math.max(1, Math.min(qty, max || 1))
  const prices = new Set(sizes.map((s) => s.price))
  const sizeLabel = (s: string) => (isOneSize(s) ? g.oneSize : s)

  const add = () => {
    if (!chosen || max < 1) return
    addToCart({
      variant: chosen.id,
      qty: n,
      title: product.title,
      size: chosen.size,
      price: chosen.price,
      slug: product.slug,
      image: product.image,
    })
    setQty(1)
    setAdded(true)
  }

  if (!sizes.length) return null
  return (
    <div className="atc">
      <span className="lbl" id={`${id}-s`}>
        {g.chooseSize}
      </span>
      <div className="szs" role="radiogroup" aria-labelledby={`${id}-s`}>
        {sizes.map((s) => {
          const out = (left[s.id] ?? 0) <= 0
          return (
            <label key={s.id} className={`szo${out ? ' out' : ''}`}>
              <input
                type="radio"
                name={`${id}-size`}
                value={s.id}
                checked={pick === s.id}
                disabled={out}
                onChange={() => {
                  setPick(s.id)
                  setQty(1)
                  setAdded(false)
                }}
              />
              <b>{sizeLabel(s.size)}</b>
              <small>{out ? g.outOfStock : prices.size > 1 ? baht(s.price) : g.left(left[s.id] ?? 0)}</small>
            </label>
          )
        })}
      </div>

      <div className="ppl">
        <span>{g.qty}</span>
        <div className="stepper">
          <button type="button" aria-label={g.minus} disabled={!chosen || n <= 1} onClick={() => setQty(n - 1)}>
            −
          </button>
          <output aria-live="polite">{n}</output>
          <button type="button" aria-label={g.plus} disabled={!chosen || n >= max} onClick={() => setQty(n + 1)}>
            +
          </button>
        </div>
      </div>
      {chosen && (
        <p className="hint">
          {max > 0 ? g.left(max) : g.maxed}
          {inCart(chosen.id) > 0 && ` · ${g.inCart(inCart(chosen.id))}`}
        </p>
      )}

      <button className="pill y" type="button" disabled={!chosen || max < 1} onClick={add}>
        {chosen ? `${g.addToCart} · ${baht(chosen.price * n)}` : g.chooseSize}
      </button>
      {added && (
        <p className="added" role="status">
          {g.added} ·{' '}
          <Link href={`/${locale}/cart`} className="more">
            {g.viewCart}
          </Link>
        </p>
      )}
      {lineUrl && (
        <p className="hint">
          <a href={lineUrl} target="_blank" rel="noopener noreferrer" className="ulnk">
            {g.askLine}
          </a>
        </p>
      )}
    </div>
  )
}
