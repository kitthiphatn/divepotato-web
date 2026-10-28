'use client'

// Small form pieces shared by the website, dive-site and rental screens: the TH/EN tabs, a
// photo field that opens the media picker, a numbered form section and the Website sub-tabs.
import Link from 'next/link'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import type { MediaItem } from '../data'
import { translator, type Lang } from '../i18n'
import { Icon } from '../icons'
import { BO, WEB_TABS, type WebTab } from '../nav'
import { MediaPicker, type useLibrary } from './MediaPicker'

export type Loc = 'th' | 'en'
export type Pair = { th: string; en: string }
export const emptyPair = (): Pair => ({ th: '', en: '' })

type Library = ReturnType<typeof useLibrary>

export function LocTabs({ tl, onChange }: { tl: Loc; onChange: (l: Loc) => void }) {
  return (
    <div className="tabs" role="tablist">
      <button type="button" aria-pressed={tl === 'th'} onClick={() => onChange('th')}>
        ภาษาไทย
      </button>
      <button type="button" aria-pressed={tl === 'en'} onClick={() => onChange('en')}>
        English
      </button>
    </div>
  )
}

export function Section({
  no,
  title,
  hint,
  id,
  children,
  aside,
}: {
  no?: number
  title: string
  hint?: string
  id?: string
  children: ReactNode
  aside?: ReactNode
}) {
  return (
    <section className="card fsec" id={id}>
      <div className="ch">
        <h3>
          {no ? <span className="no">{no}</span> : null}
          {title}
        </h3>
        {aside}
      </div>
      {hint && <p className="hint">{hint}</p>}
      {children}
    </section>
  )
}

// A photo slot: thumbnail plus "pick or upload" and "remove" buttons, using the shared picker
export function PhotoField({
  lang,
  label,
  value,
  onChange,
  media,
  hint,
  ratio = 'wide',
  pickerTitle,
}: {
  lang: Lang
  label: string
  value: number | null
  onChange: (id: number | null) => void
  media: Library
  hint?: string
  ratio?: 'wide' | 'square' | 'tall'
  pickerTitle?: string
}) {
  const L = translator(lang)
  const [open, setOpen] = useState(false)
  const m: MediaItem | undefined = value ? media.byId.get(value) : undefined
  return (
    <div className="phfield">
      <span className="field" style={{ marginBottom: 6 }}>
        <span>{label}</span>
      </span>
      <div className="covpick">
        <button type="button" className={`cvb r-${ratio}`} onClick={() => setOpen(true)}>
          {m ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.url} alt={m.alt} />
          ) : (
            <span className="noimg">
              <Icon name="image" />
            </span>
          )}
          <span className="sr">{label}</span>
        </button>
        <span className="cvact">
          <button className="btn o sm" type="button" onClick={() => setOpen(true)}>
            <Icon name="image" />
            {m ? L('เปลี่ยนรูป', 'Change') : L('เลือกหรืออัปโหลดรูป', 'Pick or upload')}
          </button>
          {value ? (
            <button className="btn t sm" type="button" onClick={() => onChange(null)}>
              <Icon name="x" />
              {L('เอารูปออก', 'Remove')}
            </button>
          ) : null}
        </span>
      </div>
      {hint && <p className="hint small">{hint}</p>}
      {open && (
        <MediaPicker
          lang={lang}
          library={media.lib}
          onUploaded={media.add}
          selected={value ? [value] : []}
          onChange={(ids) => onChange(ids[0] ?? null)}
          onClose={() => setOpen(false)}
          title={pickerTitle ?? label}
          hint={hint}
        />
      )}
    </div>
  )
}

// Character counter shown next to a label (same as the article editor)
export const Count = ({ s, max }: { s: string; max: number }) => (
  <em className={`cnt${s.length > max ? ' over' : ''}`}>
    {s.length}/{max}
  </em>
)

// ---------- Website sub-tabs ----------

const WEB_TAB_LABEL: Record<WebTab, [string, string, string]> = {
  slides: ['สไลด์หน้าแรก', 'Home slides', 'image'],
  home: ['หน้าแรก', 'Home page', 'globe'],
  articles: ['บทความ', 'Articles', 'edit'],
  ann: ['แถบประกาศ', 'Announcement', 'mega'],
  popup: ['ป๊อปอัป', 'Popup', 'sparkle'],
  about: ['เกี่ยวกับเรา', 'About us', 'heart'],
  faq: ['คำถามที่พบบ่อย', 'FAQs', 'chat'],
  cookie: ['แบนเนอร์คุกกี้', 'Cookie banner', 'alert'],
  site: ['ข้อมูลร้าน', 'Shop info', 'sliders'],
  media: ['คลังรูป', 'Media', 'image'],
}

// Page header of the Website section and its tabs. Tabs listed in `local` switch inside the
// current screen (the home slides editor keeps its three tabs in one state); the rest are links.
export function WebsiteHead({
  lang,
  tab,
  acts,
  lede,
  local = [],
  onLocal,
}: {
  lang: Lang
  tab: WebTab
  acts?: ReactNode
  lede?: string
  local?: readonly WebTab[]
  onLocal?: (t: WebTab) => void
}) {
  const L = translator(lang)
  const bar = useRef<HTMLDivElement>(null)
  // Keep the current tab in view when the row scrolls (narrow screens)
  useEffect(() => {
    const el = bar.current?.querySelector<HTMLElement>('[aria-pressed="true"]')
    const box = bar.current
    if (el && box && box.scrollWidth > box.clientWidth)
      box.scrollLeft = el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2
  }, [tab])
  return (
    <>
      <div className="ph">
        <div>
          <h1>{L('หน้าเว็บไซต์', 'Website')}</h1>
          <p className="lede">
            {lede ??
              L('แก้ไขสิ่งที่ลูกค้าเห็นบนเว็บไซต์', 'Edit what customers see on the website')}
          </p>
        </div>
        {acts && <div className="acts">{acts}</div>}
      </div>
      <div className="seg lgs wtabs" ref={bar} role="tablist">
        {WEB_TABS.map((k) => {
          const [th, en, ic] = WEB_TAB_LABEL[k]
          return local.includes(k) && onLocal ? (
            <button key={k} type="button" aria-pressed={tab === k} onClick={() => onLocal(k)}>
              <Icon name={ic} />
              {L(th, en)}
            </button>
          ) : (
            <Link
              key={k}
              href={`${BO}/website?tab=${k}`}
              aria-pressed={tab === k}
              role="button"
              scroll={false}
            >
              <Icon name={ic} />
              {L(th, en)}
            </Link>
          )
        })}
      </div>
    </>
  )
}

// Section sub-tabs for Trips, Shop and Bookings (links between sibling pages)
export function SubTabs({
  items,
}: {
  items: { href: string; label: string; icon: string; on: boolean }[]
}) {
  return (
    <div className="seg lgs wtabs" role="tablist" style={{ marginBottom: 20 }}>
      {items.map((t) => (
        <Link key={t.href} href={t.href} aria-pressed={t.on} role="button">
          <Icon name={t.icon} />
          {t.label}
        </Link>
      ))}
    </div>
  )
}
