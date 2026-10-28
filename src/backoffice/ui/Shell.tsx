'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useSyncExternalStore, useTransition, type ReactNode } from 'react'

import { logoutAction, setLangAction } from '../actions/session'
import { initials } from '../format'
import { ROLE_LABEL, THEME_COOKIE, translator, type Lang } from '../i18n'
import { Icon } from '../icons'
import { BO, navKeyOf, type NavItem } from '../nav'
import { Modal } from './Modal'
import { ToastProvider } from './Toast'

type Props = {
  nav: NavItem[]
  counts: Partial<Record<string, number>>
  user: { name: string; email: string; role: string }
  lang: Lang
  theme: 'light' | 'dark' | null
  children: ReactNode
}

const darkQuery = '(prefers-color-scheme: dark)'
const subscribeDark = (cb: () => void) => {
  const mq = matchMedia(darkQuery)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}

// Light/dark: the saved choice (cookie, also read on the server), else the system setting
function useDark(initial: 'light' | 'dark' | null) {
  const system = useSyncExternalStore(
    subscribeDark,
    () => matchMedia(darkQuery).matches,
    () => false,
  )
  const [choice, setChoice] = useState(initial)
  const dark = choice ? choice === 'dark' : system
  const toggle = () => {
    const next = dark ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    document.cookie = `${THEME_COOKIE}=${next};path=/;max-age=31536000;samesite=lax`
    setChoice(next)
  }
  return [dark, toggle] as const
}

export function LangSeg({ lang }: { lang: Lang }) {
  const router = useRouter()
  const [, start] = useTransition()
  const pick = (l: Lang) =>
    start(async () => {
      await setLangAction(l)
      router.refresh()
    })
  return (
    <div className="seg" role="group" aria-label="Language">
      <button type="button" aria-pressed={lang === 'th'} onClick={() => pick('th')}>
        TH
      </button>
      <button type="button" aria-pressed={lang === 'en'} onClick={() => pick('en')}>
        EN
      </button>
    </div>
  )
}

export function Shell({ nav, counts, user, lang, theme, children }: Props) {
  const L = translator(lang)
  const pathname = usePathname()
  const route = navKeyOf(pathname)
  const [dark, toggleDark] = useDark(theme)
  const [sheet, setSheet] = useState(false)
  const [menu, setMenu] = useState(false)

  const cur = nav.find((n) => n.key === route) ?? nav[0]
  const tabs = nav.slice(0, 4)
  const more = nav.slice(4)
  const role = ROLE_LABEL[user.role]

  const item = (n: NavItem, short = false) => {
    const c = counts[n.key] ?? 0
    return (
      <Link
        key={n.key}
        href={n.href}
        aria-current={route === n.key ? 'page' : undefined}
        onClick={() => setSheet(false)}
      >
        <Icon name={n.icon} />
        <span>{short && n.short ? L(...n.short) : L(n.th, n.en)}</span>
        {c > 0 && <b className="cnt">{c}</b>}
      </Link>
    )
  }
  const group = (g: number, th: string, en: string) => {
    const items = nav.filter((n) => n.group === g)
    if (!items.length) return null
    return (
      <>
        <p className="ngrp">{L(th, en)}</p>
        <nav className="nav">{items.map((n) => item(n))}</nav>
      </>
    )
  }

  return (
    <ToastProvider>
      <div className="app">
        <aside className="side">
          <Link className="brand" href={BO}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/backoffice/logo.png" alt="" />
            <span>
              <b>Dive Potato</b>
              <small>{L('หลังบ้าน', 'Backoffice')}</small>
            </span>
          </Link>
          {group(0, 'งานประจำวัน', 'Daily work')}
          {group(1, 'ขายและเนื้อหา', 'Sell & content')}
          <div className="foot">
            <nav className="nav">{nav.filter((n) => n.group === 2).map((n) => item(n))}</nav>
            <button className="me" type="button" onClick={() => setMenu(true)}>
              <span className="av y">{initials(user.name)}</span>
              <span>
                <b>{user.name}</b>
                <small>{role ? L(role[0], role[1]) : user.role}</small>
              </span>
            </button>
          </div>
        </aside>
        <div className="main">
          <header className="top">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="mlogo" src="/backoffice/logo.png" alt="Dive Potato" />
            <div className="crumb">
              <b>{cur ? L(cur.th, cur.en) : 'Dive Potato'}</b>
            </div>
            <div className="r">
              <LangSeg lang={lang} />
              <button
                className="ibtn hide-m"
                type="button"
                onClick={toggleDark}
                aria-label={L('สลับโหมดสว่าง/มืด', 'Toggle theme')}
              >
                <Icon name={dark ? 'today' : 'moon'} />
              </button>
            </div>
          </header>
          <main className="view" id="view">
            {children}
          </main>
        </div>
        <nav className="tabbar" aria-label="Main">
          {tabs.map((n) => item(n, true))}
          <button
            type="button"
            onClick={() => setSheet((s) => !s)}
            aria-current={more.some((n) => n.key === route) ? 'page' : undefined}
          >
            <Icon name="more" />
            <span>{L('เพิ่มเติม', 'More')}</span>
          </button>
        </nav>
      </div>

      <div className={`scrim${sheet ? ' on' : ''}`} onClick={() => setSheet(false)} />
      <div
        className={`sheet${sheet ? ' on' : ''}`}
        role="dialog"
        aria-label={L('เพิ่มเติม', 'More')}
      >
        <div className="grab" />
        {more.map((n) => (
          <Link key={n.key} href={n.href} onClick={() => setSheet(false)}>
            <span className="sic">
              <Icon name={n.icon} />
            </span>
            {L(n.th, n.en)}
          </Link>
        ))}
        {more.length > 0 && <hr />}
        <button className="it" type="button" onClick={toggleDark}>
          <span className="sic">
            <Icon name={dark ? 'today' : 'moon'} />
          </span>
          {dark ? L('โหมดสว่าง', 'Light mode') : L('โหมดมืด', 'Dark mode')}
        </button>
        <button className="it" type="button" onClick={() => setMenu(true)}>
          <span className="sic">{initials(user.name)}</span>
          {user.name}
        </button>
        <form action={logoutAction}>
          <button className="it" type="submit">
            <span className="sic">
              <Icon name="logout" />
            </span>
            {L('ออกจากระบบ', 'Log out')}
          </button>
        </form>
      </div>

      {menu && (
        <Modal onClose={() => setMenu(false)} label={user.name}>
          <div style={{ textAlign: 'center' }}>
            <span className="av lg y" style={{ margin: '0 auto 12px' }}>
              {initials(user.name)}
            </span>
            <h3>{user.name}</h3>
            <p className="s">
              {user.email} · {role ? L(role[0], role[1]) : user.role}
            </p>
          </div>
          <form className="acts" action={logoutAction}>
            <button className="btn o" type="button" onClick={() => setMenu(false)}>
              {L('ปิด', 'Close')}
            </button>
            <button className="btn k" type="submit">
              <Icon name="logout" />
              {L('ออกจากระบบ', 'Log out')}
            </button>
          </form>
        </Modal>
      )}
    </ToastProvider>
  )
}
