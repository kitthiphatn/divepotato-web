'use client'

import { useEffect, useState, useTransition } from 'react'

import { savePopupAction, type PopupInput } from '../actions/site'
import type { MediaItem } from '../data'
import { translator, type Lang } from '../i18n'
import { Icon } from '../icons'
import { LocTabs, PhotoField, Section, WebsiteHead, type Loc } from './fields'
import { useLibrary } from './MediaPicker'
import { useToast } from './Toast'

type Slide = PopupInput['slides'][number]
const blank = (): Slide => ({
  id: null,
  image: { th: null, en: null },
  mobileImage: { th: null, en: null },
  link: '',
})

// The announcement popup (16:9 image slider shown when visitors open the site), with a live
// preview for desktop and phone
export function PopupEditor({
  lang,
  value,
  library,
}: {
  lang: Lang
  value: PopupInput
  library: MediaItem[]
}) {
  const L = translator(lang)
  const toast = useToast()
  const [pending, start] = useTransition()
  const [v, setV] = useState(value)
  const [tl, setTl] = useState<Loc>(lang)
  const [keys, setKeys] = useState(() => value.slides.map((r, i) => r.id ?? `n${i}`))
  const [cur, setCur] = useState(0)
  const [device, setDevice] = useState<'desktop' | 'phone'>('desktop')
  const media = useLibrary(library)
  const set = <K extends keyof PopupInput>(k: K, x: PopupInput[K]) =>
    setV((o) => ({ ...o, [k]: x }))
  const setSlide = (i: number, p: Partial<Slide>) =>
    setV((o) => ({ ...o, slides: o.slides.map((r, j) => (j === i ? { ...r, ...p } : r)) }))
  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= v.slides.length) return
    const swap = <T,>(xs: T[]) => {
      const n = [...xs]
      ;[n[i], n[j]] = [n[j], n[i]]
      return n
    }
    setV((o) => ({ ...o, slides: swap(o.slides) }))
    setKeys(swap)
    setCur(j)
  }

  // Auto-advance in the preview too, so the timing can be judged
  const count = v.slides.length
  useEffect(() => {
    if (!v.autoplay || count < 2) return
    const ms = Math.min(60, Math.max(2, v.autoplaySeconds || 5)) * 1000
    const t = setInterval(() => setCur((c) => (c + 1) % count), ms)
    return () => clearInterval(t)
  }, [v.autoplay, v.autoplaySeconds, count])
  const at = Math.min(cur, Math.max(0, count - 1))

  const save = () =>
    start(async () => {
      const r = await savePopupAction(v)
      toast(r.message, r.ok)
    })
  const btn = (lg = false) => (
    <button className={`btn y${lg ? ' lg' : ''}`} type="button" disabled={pending} onClick={save}>
      <Icon name="check" />
      {L('บันทึกและเผยแพร่', 'Save & publish')}
    </button>
  )

  const slide = v.slides[at]
  const pickImg = (p: { th: number | null; en: number | null } | undefined) => {
    const id = p ? (p[tl] ?? p.th ?? p.en) : null
    return id ? media.byId.get(id) : undefined
  }
  const desk = pickImg(slide?.image)
  const mob = pickImg(slide?.mobileImage)
  const shown = device === 'phone' ? (mob ?? desk) : desk
  const tall = device === 'phone' && !!mob

  return (
    <>
      <WebsiteHead
        lang={lang}
        tab="popup"
        lede={L(
          'หน้าต่างสไลด์รูป 16:9 ที่แสดงทันทีเมื่อลูกค้าเปิดเว็บ',
          'A 16:9 image slider shown as soon as visitors open the site',
        )}
        acts={btn()}
      />
      <div className="edit">
        <div className="forms">
          <Section
            no={1}
            title={L('การแสดงผล', 'Display')}
            hint={L('เปิด/ปิด ความถี่ และช่วงเวลาที่แสดง', 'On/off, how often and when it shows')}
          >
            <div className="tog" style={{ paddingTop: 0 }}>
              <span>
                <b>{L('เปิดแสดงป๊อปอัป', 'Show the popup')}</b>
                <span>
                  {L(
                    'เมื่อแก้ไขสไลด์ ลูกค้าจะเห็นป๊อปอัปใหม่อีกครั้งเสมอ',
                    'Visitors always see it again after the slides change',
                  )}
                </span>
              </span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={v.enabled}
                  onChange={(e) => set('enabled', e.target.checked)}
                />
                <i />
                <span className="sr">{L('เปิดแสดง', 'Show')}</span>
              </label>
            </div>
            <div className="f2" style={{ marginTop: 12 }}>
              <label className="field">
                <span>{L('แสดงบ่อยแค่ไหน', 'How often')}</span>
                <select
                  className="inp"
                  value={v.frequency}
                  onChange={(e) =>
                    set('frequency', e.target.value === 'session' ? 'session' : 'day')
                  }
                >
                  <option value="day">{L('วันละครั้งต่อคน', 'Once a day per visitor')}</option>
                  <option value="session">{L('ทุกครั้งที่เปิดเว็บใหม่', 'Every new visit')}</option>
                </select>
              </label>
            </div>
            <div className="f2">
              <label className="field">
                <span>{L('เริ่มแสดง', 'Starts')}</span>
                <input
                  className="inp"
                  type="datetime-local"
                  value={v.startsAt}
                  onChange={(e) => set('startsAt', e.target.value)}
                />
              </label>
              <label className="field">
                <span>{L('สิ้นสุด', 'Ends')}</span>
                <input
                  className="inp"
                  type="datetime-local"
                  value={v.endsAt}
                  onChange={(e) => set('endsAt', e.target.value)}
                />
              </label>
            </div>
            <p className="hint small">
              {L('เวลาไทย · เว้นว่างเพื่อแสดงตลอด', 'Thai time · leave empty to show at any time')}
            </p>
            <div className="tog">
              <span>
                <b>
                  {L('มีกรอบขาวรอบรูปและจุดเลื่อนสไลด์', 'White frame around the slides and dots')}
                </b>
                <span>
                  {L(
                    'ปิดไว้ รูปและจุดด้านล่างจะวางบนพื้นหลังโปร่งใส',
                    'When off, the slides and dots sit on the see-through backdrop',
                  )}
                </span>
              </span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={v.framed}
                  onChange={(e) => set('framed', e.target.checked)}
                />
                <i />
                <span className="sr">{L('กรอบขาว', 'Frame')}</span>
              </label>
            </div>
            <div className="tog">
              <span>
                <b>{L('เลื่อนสไลด์อัตโนมัติ', 'Auto-advance slides')}</b>
                <span>
                  {L(
                    'หยุดเลื่อนชั่วคราวเมื่อลูกค้าชี้เมาส์หรือลากรูปอยู่',
                    'Pauses while the visitor hovers over or drags the slides',
                  )}
                </span>
              </span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={v.autoplay}
                  onChange={(e) => set('autoplay', e.target.checked)}
                />
                <i />
                <span className="sr">{L('เลื่อนอัตโนมัติ', 'Auto-advance')}</span>
              </label>
            </div>
            {v.autoplay && (
              <label className="field" style={{ maxWidth: 260, marginTop: 10 }}>
                <span>{L('เปลี่ยนสไลด์ทุกกี่วินาที', 'Seconds per slide')}</span>
                <span className="unit">
                  <input
                    className="inp num"
                    type="number"
                    min={2}
                    max={60}
                    value={v.autoplaySeconds}
                    onChange={(e) => set('autoplaySeconds', Number(e.target.value))}
                  />
                  <em>{L('วินาที', 'sec')}</em>
                </span>
              </label>
            )}
          </Section>

          <Section
            no={2}
            title={L('สไลด์', 'Slides')}
            hint={L(
              'รูป 1600×900 พิกเซล และรูปมือถือ 1080×1920 พิกเซล · เลือกรูปแยกตามภาษาได้',
              'Images 1600×900 px, plus 1080×1920 px for phones · each language can have its own',
            )}
            aside={
              v.slides.length < 10 ? (
                <button
                  className="btn g sm"
                  type="button"
                  onClick={() => {
                    setV((o) => ({ ...o, slides: [...o.slides, blank()] }))
                    setKeys((k) => [...k, `n${Date.now()}`])
                    setCur(v.slides.length)
                  }}
                >
                  <Icon name="plus" />
                  {L('เพิ่มสไลด์', 'Add slide')}
                </button>
              ) : null
            }
          >
            <LocTabs tl={tl} onChange={setTl} />
            {v.slides.length === 0 && (
              <p className="muted small">
                {L('ยังไม่มีสไลด์ · กดเพิ่มสไลด์', 'No slides yet · add one')}
              </p>
            )}
            <div className="hlist">
              {v.slides.map((r, i) => (
                <div
                  key={keys[i]}
                  className={`hrow${i === at ? ' on' : ''}`}
                  onFocus={() => setCur(i)}
                  onClick={() => setCur(i)}
                >
                  <div className="hh">
                    <b>
                      {L('สไลด์', 'Slide')} {i + 1}
                    </b>
                    <span className="blact">
                      <button
                        className="ibtn"
                        type="button"
                        disabled={i === 0}
                        onClick={() => move(i, -1)}
                        aria-label={L('เลื่อนขึ้น', 'Move up')}
                      >
                        <Icon name="back" className="up" />
                      </button>
                      <button
                        className="ibtn"
                        type="button"
                        disabled={i === v.slides.length - 1}
                        onClick={() => move(i, 1)}
                        aria-label={L('เลื่อนลง', 'Move down')}
                      >
                        <Icon name="back" className="down" />
                      </button>
                      <button
                        className="ibtn"
                        type="button"
                        aria-label={L('ลบสไลด์', 'Remove slide')}
                        onClick={(e) => {
                          e.stopPropagation()
                          setV((o) => ({ ...o, slides: o.slides.filter((_, j) => j !== i) }))
                          setKeys((k) => k.filter((_, j) => j !== i))
                          setCur(0)
                        }}
                      >
                        <Icon name="trash" />
                      </button>
                    </span>
                  </div>
                  <div className="popimgs">
                    <PhotoField
                      lang={lang}
                      label={`${L('รูป (16:9)', 'Image (16:9)')} · ${tl.toUpperCase()}`}
                      value={r.image[tl]}
                      media={media}
                      onChange={(id) => setSlide(i, { image: { ...r.image, [tl]: id } })}
                      hint={
                        tl === 'en' && !r.image.en
                          ? L('ว่างไว้ = ใช้รูปภาษาไทย', 'Empty = uses the Thai image')
                          : undefined
                      }
                    />
                    <PhotoField
                      lang={lang}
                      label={`${L('รูปมือถือ (9:16)', 'Mobile (9:16)')} · ${tl.toUpperCase()}`}
                      value={r.mobileImage[tl]}
                      media={media}
                      ratio="tall"
                      onChange={(id) =>
                        setSlide(i, { mobileImage: { ...r.mobileImage, [tl]: id } })
                      }
                    />
                  </div>
                  <label className="field" style={{ marginBottom: 0 }}>
                    <span>{L('ลิงก์เมื่อกดรูป (ถ้ามี)', 'Link when clicked (optional)')}</span>
                    <input
                      className="inp"
                      value={r.link}
                      placeholder="/th/trips"
                      onChange={(e) => setSlide(i, { link: e.target.value })}
                    />
                  </label>
                </div>
              ))}
            </div>
          </Section>
          <div className="savebar">{btn(true)}</div>
        </div>

        <aside className="prev">
          <p className="lab">
            <Icon name="eye" />
            {L('ตัวอย่างป๊อปอัป', 'Popup preview')} · {tl.toUpperCase()}
          </p>
          <div className="seg" style={{ marginBottom: 12 }}>
            <button
              type="button"
              aria-pressed={device === 'desktop'}
              onClick={() => setDevice('desktop')}
            >
              {L('คอมพิวเตอร์', 'Desktop')}
            </button>
            <button
              type="button"
              aria-pressed={device === 'phone'}
              onClick={() => setDevice('phone')}
            >
              {L('มือถือ', 'Phone')}
            </button>
          </div>
          <div className={`poppv ${device}${v.enabled ? '' : ' off'}`}>
            <div className="site">
              <span />
              <span />
              <span />
            </div>
            <div className={`pbox${v.framed ? ' framed' : ''}${tall ? ' tall' : ''}`}>
              <span className="px" aria-hidden="true">
                <Icon name="x" />
              </span>
              <div className="pimg">
                {shown ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={shown.url} alt={shown.alt} />
                ) : (
                  <span className="noimg">
                    <Icon name="image" />
                  </span>
                )}
              </div>
              {count > 1 && (
                <div className="pdots">
                  {v.slides.map((_, i) => (
                    <button
                      key={keys[i]}
                      type="button"
                      className={i === at ? 'on' : ''}
                      onClick={() => setCur(i)}
                      aria-label={`${L('สไลด์', 'Slide')} ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
          <p className="hint small" style={{ marginTop: 10 }}>
            {v.enabled
              ? `${L('เปิดแสดงอยู่', 'Showing')} · ${
                  v.frequency === 'day'
                    ? L('วันละครั้งต่อคน', 'once a day per visitor')
                    : L('ทุกครั้งที่เปิดเว็บใหม่', 'every new visit')
                }`
              : L('ซ่อนอยู่ · ลูกค้ายังไม่เห็นป๊อปอัป', 'Hidden · visitors do not see it')}
          </p>
        </aside>
      </div>
    </>
  )
}
