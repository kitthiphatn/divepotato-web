'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'

import {
  saveAnnouncementAction,
  saveHeroSlidesAction,
  type AnnouncementInput,
  type SlideInput,
} from '../actions/website'
import type { MediaItem } from '../data'
import { fd } from '../format'
import { pair, POST_CAT_LABEL, translator, type Lang, type PostCategory } from '../i18n'
import { Icon } from '../icons'
import { BO } from '../nav'
import { WebsiteHead } from './fields'
import { MediaPicker, useLibrary } from './MediaPicker'
import { useToast } from './Toast'

type Loc = 'th' | 'en'
type Tab = 'slides' | 'articles' | 'ann'
const LOCAL = ['slides', 'articles', 'ann'] as const
export type ArticleRow = {
  id: number
  title: string
  category: string
  date: string
  published: boolean
  cover: string | null
}

const blank = (): SlideInput => ({
  id: null,
  image: null,
  title: { th: '', en: '' },
  subtitle: { th: '', en: '' },
  buttonLabel: { th: '', en: '' },
  buttonLink: '',
})

export function WebsiteEditor({
  lang,
  tab: initialTab,
  slides: initialSlides,
  announcement,
  articles,
  library,
}: {
  lang: Lang
  tab: Tab
  slides: SlideInput[]
  announcement: AnnouncementInput
  articles: ArticleRow[]
  library: MediaItem[]
}) {
  const L = translator(lang)
  const toast = useToast()
  const [pending, start] = useTransition()
  const [tab, setTab] = useState<Tab>(initialTab)
  const [slides, setSlides] = useState(initialSlides)
  const [cur, setCur] = useState(0)
  const [tl, setTl] = useState<Loc>(lang)
  const [ann, setAnn] = useState(announcement)
  const media = useLibrary(library)
  const byId = media.byId
  const [picker, setPicker] = useState(false)
  const slide = slides[cur]
  // Quick picks: the slide's own photo first, then the newest photos
  const current = slide?.image ? byId.get(slide.image) : undefined
  const quick = [
    ...(current ? [current] : []),
    ...media.lib.filter((m) => m.id !== current?.id),
  ].slice(0, 9)

  const go = (t: Tab) => {
    setTab(t)
    const u = new URL(window.location.href)
    u.searchParams.set('tab', t)
    window.history.replaceState(null, '', u)
  }
  const patch = (p: Partial<SlideInput>) =>
    setSlides((xs) => xs.map((x, i) => (i === cur ? { ...x, ...p } : x)))
  const patchLoc = (k: 'title' | 'subtitle' | 'buttonLabel', value: string) =>
    slide && patch({ [k]: { ...slide[k], [tl]: value } })

  const save = () =>
    start(async () => {
      const r =
        tab === 'ann' ? await saveAnnouncementAction(ann) : await saveHeroSlidesAction(slides)
      toast(r.message, r.ok)
    })

  const annText = (loc: Loc) => ann.message[loc] || ann.message.th || ann.message.en

  return (
    <>
      <WebsiteHead
        lang={lang}
        tab={tab}
        local={LOCAL}
        onLocal={(t) => go(t as Tab)}
        lede={L(
          'แก้ไขสิ่งที่ลูกค้าเห็นบนหน้าแรกของเว็บไซต์',
          'Edit what customers see on the home page',
        )}
        acts={
          tab === 'articles' ? (
            <Link className="btn y" href={`${BO}/website/articles/new`}>
              <Icon name="plus" />
              {L('เขียนบทความใหม่', 'New article')}
            </Link>
          ) : (
            <button className="btn y" type="button" disabled={pending} onClick={save}>
              <Icon name="check" />
              {L('บันทึกและเผยแพร่', 'Save & publish')}
            </button>
          )
        }
      />

      {tab === 'slides' && (
        <div className="sl-edit">
          <div className="slist">
            {slides.map((x, i) => {
              const img = x.image ? byId.get(x.image) : null
              return (
                <button
                  key={x.id ?? `n${i}`}
                  type="button"
                  aria-pressed={cur === i}
                  onClick={() => setCur(i)}
                >
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img.url} alt="" />
                  ) : (
                    <span className="noimg sm" aria-hidden="true">
                      <Icon name="image" />
                    </span>
                  )}
                  <span style={{ minWidth: 0 }}>
                    <b>{x.title[lang] || x.title.th || L('ยังไม่มีหัวข้อ', 'Untitled')}</b>
                    <small>
                      {L('สไลด์', 'Slide')} {i + 1}
                    </small>
                  </span>
                </button>
              )
            })}
            {slides.length < 8 && (
              <button
                type="button"
                className="addsl"
                onClick={() => {
                  setSlides((xs) => [...xs, blank()])
                  setCur(slides.length)
                }}
              >
                <span className="noimg sm" aria-hidden="true">
                  <Icon name="plus" />
                </span>
                <span>
                  <b>{L('เพิ่มสไลด์', 'Add slide')}</b>
                </span>
              </button>
            )}
          </div>

          {slide ? (
            <section className="card fsec">
              <div className="ch">
                <h3>
                  {L('สไลด์ที่', 'Slide')} {cur + 1}
                </h3>
                <button
                  className="btn t sm"
                  type="button"
                  onClick={() => {
                    setSlides((xs) => xs.filter((_, i) => i !== cur))
                    setCur((c) => Math.max(0, c - 1))
                  }}
                >
                  <Icon name="trash" />
                  {L('ลบสไลด์', 'Remove')}
                </button>
              </div>
              <span className="field" style={{ marginTop: 12 }}>
                <span>{L('รูปภาพ', 'Photo')}</span>
              </span>
              <div className="phgrid">
                {quick.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    aria-pressed={slide.image === m.id}
                    title={m.alt}
                    onClick={() => patch({ image: m.id })}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.url} alt={m.alt} loading="lazy" />
                  </button>
                ))}
                <button className="up" type="button" onClick={() => setPicker(true)}>
                  <span>
                    <Icon name="upload" />
                    {L('คลังรูป / อัปโหลด', 'All / upload')}
                  </span>
                </button>
              </div>
              <div className="tabs" role="tablist">
                <button type="button" aria-pressed={tl === 'th'} onClick={() => setTl('th')}>
                  ภาษาไทย
                </button>
                <button type="button" aria-pressed={tl === 'en'} onClick={() => setTl('en')}>
                  English
                </button>
              </div>
              <label className="field">
                <span>
                  {L('หัวข้อ', 'Title')} ({tl.toUpperCase()})
                </span>
                <input
                  className="inp"
                  value={slide.title[tl]}
                  onChange={(e) => patchLoc('title', e.target.value)}
                />
              </label>
              <label className="field">
                <span>
                  {L('ข้อความรอง', 'Subtitle')} ({tl.toUpperCase()})
                </span>
                <input
                  className="inp"
                  value={slide.subtitle[tl]}
                  onChange={(e) => patchLoc('subtitle', e.target.value)}
                />
              </label>
              <div className="f2">
                <label className="field">
                  <span>
                    {L('ข้อความบนปุ่ม', 'Button text')} ({tl.toUpperCase()})
                  </span>
                  <input
                    className="inp"
                    value={slide.buttonLabel[tl]}
                    onChange={(e) => patchLoc('buttonLabel', e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>{L('ลิงก์ปุ่ม', 'Button link')}</span>
                  <input
                    className="inp"
                    value={slide.buttonLink}
                    placeholder="#trips"
                    onChange={(e) => patch({ buttonLink: e.target.value })}
                  />
                </label>
              </div>
            </section>
          ) : (
            <section className="card empty">
              {L('ยังไม่มีสไลด์ · กดเพิ่มสไลด์', 'No slides yet · add one')}
            </section>
          )}

          <div className="pvcol">
            <p
              className="lab small muted"
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                marginBottom: 12,
                fontWeight: 500,
              }}
            >
              <Icon name="eye" />
              {L('ตัวอย่างหน้าแรก', 'Home preview')} · {tl.toUpperCase()}
            </p>
            {slide && (
              <div className="hero-pv">
                {slide.image && byId.get(slide.image) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={byId.get(slide.image)!.url} alt="" />
                ) : null}
                {ann.enabled && <div className="bar0">{annText(tl)}</div>}
                <div className="nv" style={ann.enabled ? undefined : { top: 14 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/backoffice/logo.png" alt="" />
                  Dive Potato
                </div>
                <div className="tx">
                  <h2>{slide.title[tl] || slide.title.th}</h2>
                  <p>{slide.subtitle[tl]}</p>
                </div>
                {slide.buttonLabel[tl] && (
                  <div className="cta">
                    <span>{slide.buttonLabel[tl]}</span>
                  </div>
                )}
                <div className="dts">
                  {slides.map((x, i) => (
                    <i key={x.id ?? `d${i}`} className={i === cur ? 'on' : ''} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'articles' && (
        <div className="card p0">
          <div className="rows">
            <div className="row arow head">
              <span />
              <span>{L('หัวข้อ', 'Title')}</span>
              <span>{L('หมวด', 'Category')}</span>
              <span>{L('วันที่', 'Date')}</span>
              <span>{L('สถานะ', 'Status')}</span>
              <span />
            </div>
            {articles.length === 0 && (
              <div className="empty">{L('ยังไม่มีบทความ', 'No articles yet')}</div>
            )}
            {articles.map((a) => (
              <Link key={a.id} className="row arow" href={`${BO}/website/articles/${a.id}`}>
                {a.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.cover} alt="" />
                ) : (
                  <span className="noimg sm" aria-hidden="true">
                    <Icon name="image" />
                  </span>
                )}
                <span className="c2" style={{ paddingLeft: 0 }}>
                  <b>{a.title}</b>
                </span>
                <span className="hide-m muted">
                  {pair(lang, POST_CAT_LABEL[a.category as PostCategory], a.category)}
                </span>
                <span className="amt">
                  <small>{a.date ? fd(a.date, lang) : ''}</small>
                </span>
                <span className="st">
                  {a.published ? (
                    <span className="pill st-paid">{L('เผยแพร่', 'Live')}</span>
                  ) : (
                    <span className="pill st-hold">{L('ฉบับร่าง', 'Draft')}</span>
                  )}
                </span>
                <span className="chev">
                  <Icon name="chev" />
                </span>
              </Link>
            ))}
          </div>
          <p className="hint" style={{ padding: '14px 22px' }}>
            {L(
              'แตะบทความเพื่อแก้ไข ตั้งวันที่ในอนาคตเพื่อให้บทความขึ้นเว็บเองเมื่อถึงวัน',
              'Tap an article to edit it; a future date publishes it on that day',
            )}
          </p>
        </div>
      )}

      {tab === 'ann' && (
        <section className="card fsec" style={{ maxWidth: 760 }}>
          <div className="tog" style={{ paddingTop: 0 }}>
            <span>
              <b>{L('แสดงแถบประกาศด้านบนเว็บไซต์', 'Show announcement bar')}</b>
              <span>
                {L(
                  'แถบสีดำบาง ๆ เหนือเมนู เหมาะกับโปรโมชั่นสั้น ๆ หรือแจ้งงดออกเรือ',
                  'A thin black bar above the menu for short promos or weather notices',
                )}
              </span>
            </span>
            <label className="switch">
              <input
                type="checkbox"
                checked={ann.enabled}
                onChange={(e) => setAnn((a) => ({ ...a, enabled: e.target.checked }))}
              />
              <i />
              <span className="sr">{L('แสดงแถบประกาศ', 'Show bar')}</span>
            </label>
          </div>
          <label className="field">
            <span>{L('ข้อความ (ไทย)', 'Text (Thai)')}</span>
            <input
              className="inp"
              value={ann.message.th}
              onChange={(e) =>
                setAnn((a) => ({ ...a, message: { ...a.message, th: e.target.value } }))
              }
            />
          </label>
          <label className="field">
            <span>{L('ข้อความ (อังกฤษ)', 'Text (English)')}</span>
            <input
              className="inp"
              value={ann.message.en}
              onChange={(e) =>
                setAnn((a) => ({ ...a, message: { ...a.message, en: e.target.value } }))
              }
            />
          </label>
          <div className="f2">
            <label className="field">
              <span>{L('ระดับ', 'Tone')}</span>
              <select
                className="inp"
                value={ann.tone}
                onChange={(e) =>
                  setAnn((a) => ({ ...a, tone: e.target.value === 'warning' ? 'warning' : 'info' }))
                }
              >
                <option value="info">{L('แจ้งข่าว', 'Info')}</option>
                <option value="warning">{L('เตือน', 'Warning')}</option>
              </select>
            </label>
            <label className="field">
              <span>{L('ลิงก์ (ถ้ามี)', 'Link (optional)')}</span>
              <input
                className="inp"
                value={ann.link}
                onChange={(e) => setAnn((a) => ({ ...a, link: e.target.value }))}
              />
            </label>
          </div>
          <div className="annpv">
            {ann.enabled && (
              <div className={`ab${ann.tone === 'warning' ? ' warn' : ''}`}>
                <b>●</b> {annText(lang)}
              </div>
            )}
            <div className="site">
              {L('ตัวอย่างส่วนบนของเว็บไซต์', 'Top of the website (preview)')}
              {ann.enabled ? '' : ` · ${L('ซ่อนแถบประกาศอยู่', 'bar hidden')}`}
            </div>
          </div>
        </section>
      )}
      {picker && slide && (
        <MediaPicker
          lang={lang}
          library={media.lib}
          onUploaded={media.add}
          selected={slide.image ? [slide.image] : []}
          onChange={(ids) => patch({ image: ids[0] ?? null })}
          onClose={() => setPicker(false)}
          title={L('รูปสำหรับสไลด์', 'Slide photo')}
          hint={L(
            'แนะนำรูปแนวนอน กว้างอย่างน้อย 1600px',
            'Use a landscape photo, at least 1600px wide',
          )}
        />
      )}
    </>
  )
}
