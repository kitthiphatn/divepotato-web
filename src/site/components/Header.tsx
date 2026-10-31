'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { Locale } from '@/i18n/config'
import { cartCount, useCart } from '@/site/cart'
import { BagIcon } from '@/site/icons'

export type NavItem = { href: string; label: string; key: string }

type Props = {
  locale: Locale
  siteName: string
  logo: string
  items: NavItem[]
  bookHref: string
  phone: { label: string; href: string } | null
  labels: {
    main: string
    menu: string
    close: string
    bookNow: string
    bookOw: string
    language: string
    phone: string
    cart: string
  }
}

// Pages that open with a full-bleed photo: the header sits on the photo until the page scrolls
const OVERLAY = /^\/(th|en)(\/(trips|courses)\/[^/]+|\/about)?\/?$/

// Same page in the other language (slugs are shared by both languages)
const swapLocale = (path: string, to: Locale) => path.replace(/^\/(th|en)(?=\/|$)/, `/${to}`)

function current(path: string, item: NavItem, locale: Locale) {
  if (item.key === 'home') return path === `/${locale}` || path === `/${locale}/`
  return path === item.href || path.startsWith(`${item.href}/`)
}

export function Header({ locale, siteName, logo, items, bookHref, phone, labels }: Props) {
  const path = usePathname() || `/${locale}`
  const overlay = OVERLAY.test(path)
  const [solid, setSolid] = useState(false)
  const [open, setOpen] = useState(false)
  const burger = useRef<HTMLButtonElement>(null)
  const count = cartCount(useCart())

  // The announcement bar scrolls away; the fixed header follows it up, as in the design file
  useEffect(() => {
    const root = document.documentElement
    const onScroll = () => {
      const ann = document.getElementById('ann')
      const h = ann ? ann.offsetHeight : 0
      root.style.setProperty('--top', `${Math.max(0, h - window.scrollY)}px`)
      setSolid(window.scrollY > 12)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [path])

  const close = useCallback((focus = false) => {
    setOpen(false)
    if (focus) burger.current?.focus()
  }, [])

  // Close on navigation, Escape and when the window grows past the phone layout
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a new page closes the menu
    setOpen(false)
  }, [path])
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close(true)
    const mq = window.matchMedia('(min-width: 861px)')
    const onMq = () => mq.matches && close()
    window.addEventListener('keydown', onKey)
    mq.addEventListener('change', onMq)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
      mq.removeEventListener('change', onMq)
    }
  }, [open, close])

  const langLinks = (
    <>
      {(['th', 'en'] as const).map((l) => (
        <Link
          key={l}
          href={swapLocale(path, l)}
          hrefLang={l}
          lang={l}
          aria-current={l === locale ? 'true' : undefined}
          onClick={() => {
            document.cookie = `NEXT_LOCALE=${l}; path=/; max-age=31536000; samesite=lax`
          }}
        >
          {l.toUpperCase()}
        </Link>
      ))}
    </>
  )

  return (
    <>
      <header
        className={`hd${overlay ? ' trans' : ''}${solid ? ' solid' : ''}${open ? ' open' : ''}`}
        id="hd"
      >
        <div className="w">
          <Link className="brand" href={`/${locale}`} aria-label={siteName}>
            <span className="lg">
              {/* eslint-disable-next-line @next/next/no-img-element -- small logo, any format */}
              <img src={logo} width={38} height={38} alt="" decoding="async" />
            </span>
            <span className="wm">Dive Potato</span>
          </Link>
          <nav className="nav" aria-label={labels.main}>
            {items.map((it) => (
              <Link
                key={it.key}
                href={it.href}
                aria-current={current(path, it, locale) ? 'page' : undefined}
              >
                {it.label}
              </Link>
            ))}
          </nav>
          <div className="hr">
            <div className="lang" role="group" aria-label={labels.language}>
              {langLinks}
            </div>
            <Link
              className="cartb"
              href={`/${locale}/cart`}
              aria-label={count ? `${labels.cart} (${count})` : labels.cart}
              aria-current={path === `/${locale}/cart` ? 'page' : undefined}
            >
              <BagIcon />
              {count > 0 && (
                <span className="cnt num" aria-hidden="true">
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </Link>
            <Link className="pill y sm bk" href={bookHref}>
              {labels.bookNow}
            </Link>
            <button
              ref={burger}
              className="burger"
              type="button"
              aria-expanded={open}
              aria-controls="mnav"
              aria-label={open ? labels.close : labels.menu}
              onClick={() => setOpen((o) => !o)}
            >
              <i />
            </button>
          </div>
        </div>
      </header>
      {!overlay && <div className="hdsp" aria-hidden="true" />}

      <div className="mnav" id="mnav" hidden={!open} aria-label={labels.menu}>
        <nav className="ml" aria-label={labels.main}>
          {items.map((it) => (
            <Link
              key={it.key}
              href={it.href}
              aria-current={current(path, it, locale) ? 'page' : undefined}
              onClick={() => close()}
            >
              <span>{it.label}</span>
            </Link>
          ))}
        </nav>
        <div className="mf">
          <Link className="pill y full" href={bookHref} onClick={() => close()}>
            {labels.bookOw}
          </Link>
          <div className="mrow">
            <span>{labels.language}</span>
            <div className="lang" role="group" aria-label={labels.language}>
              {langLinks}
            </div>
          </div>
          {phone && (
            <div className="mrow">
              <span>{labels.phone}</span>
              <a className="num" href={phone.href}>
                {phone.label}
              </a>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
