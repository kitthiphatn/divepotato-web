'use client'

// The shop cart, kept in the visitor's browser (localStorage). Lines carry a display copy of the
// product (title, size, price, photo) so the cart can show something before the server quote
// arrives; prices and stock are always checked again on the server (see actions/shop).
import { useSyncExternalStore } from 'react'

export type CartLine = {
  variant: number
  qty: number
  title: string
  size: string
  price: number
  slug: string
  image: string | null
}

const KEY = 'dp-cart'
const EVENT = 'dp-cart'
const EMPTY: CartLine[] = []

let cache: { raw: string | null; lines: CartLine[] } = { raw: null, lines: EMPTY }

function parse(raw: string | null): CartLine[] {
  if (!raw) return EMPTY
  try {
    const v = JSON.parse(raw) as unknown
    if (!Array.isArray(v)) return EMPTY
    return v.filter(
      (l): l is CartLine =>
        l && Number.isInteger(l.variant) && Number.isInteger(l.qty) && l.qty > 0 && typeof l.title === 'string',
    )
  } catch {
    return EMPTY
  }
}

function read(): CartLine[] {
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(KEY)
  } catch {
    // Storage blocked (private mode, settings): the cart just stays empty
  }
  if (raw !== cache.raw) cache = { raw, lines: parse(raw) }
  return cache.lines
}

function write(lines: CartLine[]) {
  try {
    if (lines.length) window.localStorage.setItem(KEY, JSON.stringify(lines))
    else window.localStorage.removeItem(KEY)
  } catch {
    // Storage full or blocked
  }
  window.dispatchEvent(new Event(EVENT))
}

function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => e.key === KEY && cb()
  window.addEventListener(EVENT, cb)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(EVENT, cb)
    window.removeEventListener('storage', onStorage)
  }
}

// Current cart lines; empty while rendering on the server
export const useCart = () => useSyncExternalStore(subscribe, read, () => EMPTY)

export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.qty, 0)

export function addToCart(line: CartLine) {
  const lines = read()
  const i = lines.findIndex((l) => l.variant === line.variant)
  write(
    i < 0
      ? [...lines, line]
      : lines.map((l, j) => (j === i ? { ...line, qty: l.qty + line.qty } : l)),
  )
}

// Set a line's quantity (0 removes it), optionally refreshing its display copy
export function setCartQty(variant: number, qty: number, update?: Partial<CartLine>) {
  write(
    read()
      .map((l) => (l.variant === variant ? { ...l, ...update, qty } : l))
      .filter((l) => l.qty > 0),
  )
}

export const clearCart = () => write(EMPTY)
