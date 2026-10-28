'use client'

import { useState, useTransition } from 'react'

import { saveAboutAction, type AboutInput } from '../actions/site'
import { plainInline, type Block } from '../blocks'
import type { MediaItem } from '../data'
import { translator, type Lang } from '../i18n'
import { Icon } from '../icons'
import { BlockEditor, BlocksPreview } from './BlockEditor'
import { Count, LocTabs, PhotoField, Section, WebsiteHead, type Loc } from './fields'
import { useLibrary } from './MediaPicker'
import { useToast } from './Toast'

type Stat = AboutInput['stats'][number]

// The About page global: title, intro, main photo, key figures, body (block editor) and SEO,
// with a live page preview
export function AboutEditor({
  lang,
  value,
  library,
  lossy,
}: {
  lang: Lang
  value: AboutInput
  library: MediaItem[]
  lossy: { th: boolean; en: boolean }
}) {
  const L = translator(lang)
  const toast = useToast()
  const [pending, start] = useTransition()
  const [v, setV] = useState(value)
  const [tl, setTl] = useState<Loc>(lang)
  const [keys, setKeys] = useState(() => value.stats.map((r, i) => r.id ?? `n${i}`))
  const media = useLibrary(library)
  const img = v.image ? media.byId.get(v.image) : undefined

  type LocKey = 'title' | 'intro' | 'seoTitle' | 'seoDescription'
  const setLoc = (k: LocKey, x: string) => setV((o) => ({ ...o, [k]: { ...o[k], [tl]: x } }))
  const setStat = (i: number, p: Partial<Stat>) =>
    setV((o) => ({ ...o, stats: o.stats.map((r, j) => (j === i ? { ...r, ...p } : r)) }))
  const setBody = (blocks: Block[]) =>
    setV((o) => ({
      ...o,
      content: { ...o.content, [tl]: blocks },
      contentDirty: { ...o.contentDirty, [tl]: true },
    }))

  const save = () =>
    start(async () => {
      const r = await saveAboutAction(v)
      toast(r.message, r.ok)
      if (r.ok) setV((o) => ({ ...o, contentDirty: { th: false, en: false } }))
    })
  const btn = (lg = false) => (
    <button className={`btn y${lg ? ' lg' : ''}`} type="button" disabled={pending} onClick={save}>
      <Icon name="check" />
      {L('บันทึกและเผยแพร่', 'Save & publish')}
    </button>
  )
  const seoTitle = v.seoTitle[tl] || v.title[tl] || v.title.th
  const seoDesc =
    v.seoDescription[tl] ||
    v.intro[tl] ||
    plainInline(v.content[tl].find((b) => b.kind === 'p')?.text ?? '').slice(0, 160)

  return (
    <>
      <WebsiteHead
        lang={lang}
        tab="about"
        lede={L(
          'หน้าเกี่ยวกับเรา เรื่องราวและตัวเลขของร้าน',
          'The About page: your story and figures',
        )}
        acts={btn()}
      />
      <div className="edit art">
        <div className="forms">
          <Section
            no={1}
            title={L('หัวข้อและคำโปรย', 'Title & intro')}
            hint={L(
              'เขียนทั้งภาษาไทยและอังกฤษ ลูกค้าจะเห็นตามภาษาที่เลือก',
              'Write Thai and English; readers see their language',
            )}
          >
            <LocTabs tl={tl} onChange={setTl} />
            <label className="field">
              <span>
                {L('หัวข้อ', 'Title')} ({tl.toUpperCase()})
              </span>
              <input
                className="inp"
                value={v.title[tl]}
                onChange={(e) => setLoc('title', e.target.value)}
              />
            </label>
            <label className="field">
              <span>
                {L('คำโปรย', 'Intro')} ({tl.toUpperCase()})
              </span>
              <textarea
                className="inp"
                rows={3}
                value={v.intro[tl]}
                onChange={(e) => setLoc('intro', e.target.value)}
              />
            </label>
            <PhotoField
              lang={lang}
              label={L('รูปหลัก (16:9)', 'Main image (16:9)')}
              value={v.image}
              media={media}
              onChange={(id) => setV((o) => ({ ...o, image: id }))}
            />
          </Section>

          <Section
            no={2}
            title={L('ตัวเลขเด่น', 'Key figures')}
            hint={L('เช่น 25+ ปีประสบการณ์ สูงสุด 6 ข้อ', 'e.g. 25+ years of diving, up to 6')}
            aside={
              v.stats.length < 6 ? (
                <button
                  className="btn g sm"
                  type="button"
                  onClick={() => {
                    setV((o) => ({
                      ...o,
                      stats: [...o.stats, { id: null, value: '', label: { th: '', en: '' } }],
                    }))
                    setKeys((k) => [...k, `n${Date.now()}`])
                  }}
                >
                  <Icon name="plus" />
                  {L('เพิ่มตัวเลข', 'Add figure')}
                </button>
              ) : null
            }
          >
            {v.stats.length === 0 && (
              <p className="muted small">{L('ยังไม่มีตัวเลขเด่น', 'No key figures yet')}</p>
            )}
            {v.stats.map((r, i) => (
              <div key={keys[i]} className="statrow">
                <label className="field">
                  <span>{L('ตัวเลข', 'Value')}</span>
                  <input
                    className="inp num"
                    value={r.value}
                    placeholder="25+"
                    onChange={(e) => setStat(i, { value: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span>
                    {L('คำอธิบาย', 'Label')} ({tl.toUpperCase()})
                  </span>
                  <input
                    className="inp"
                    value={r.label[tl]}
                    onChange={(e) => setStat(i, { label: { ...r.label, [tl]: e.target.value } })}
                  />
                </label>
                <button
                  className="ibtn"
                  type="button"
                  aria-label={L('ลบตัวเลข', 'Remove figure')}
                  onClick={() => {
                    setV((o) => ({ ...o, stats: o.stats.filter((_, j) => j !== i) }))
                    setKeys((k) => k.filter((_, j) => j !== i))
                  }}
                >
                  <Icon name="trash" />
                </button>
              </div>
            ))}
          </Section>

          <Section
            no={3}
            title={L('เนื้อหา', 'Content')}
            hint={`${L('ภาษาที่แก้อยู่', 'Editing')}: ${tl === 'th' ? 'ภาษาไทย' : 'English'}`}
          >
            <LocTabs tl={tl} onChange={setTl} />
            {lossy[tl] && !v.contentDirty[tl] && (
              <p className="banner amb small" style={{ marginBottom: 10 }}>
                <Icon name="alert" />
                {L(
                  'เนื้อหานี้มีรูปแบบพิเศษบางอย่าง ถ้าแก้เนื้อหาภาษานี้ ข้อความจะยังอยู่ครบแต่รูปแบบพิเศษจะถูกปรับให้เรียบง่าย',
                  'This content has some special formatting. Editing this language keeps all text but simplifies that formatting.',
                )}
              </p>
            )}
            <BlockEditor
              key={tl}
              lang={lang}
              label={L('ตัวแก้ไขเนื้อหา', 'Content editor')}
              blocks={v.content[tl]}
              onChange={setBody}
              media={media}
            />
          </Section>

          <Section
            no={4}
            title="SEO"
            hint={`${L(
              'เว้นว่างได้ ระบบจะใช้หัวข้อและคำโปรยแทน',
              'Optional; the title and intro are used when empty',
            )} · ${tl === 'th' ? 'ภาษาไทย' : 'English'}`}
          >
            <label className="field">
              <span>
                {L('หัวข้อบน Google', 'Search title')} <Count s={v.seoTitle[tl]} max={70} />
              </span>
              <input
                className="inp"
                maxLength={70}
                value={v.seoTitle[tl]}
                placeholder={v.title[tl]}
                onChange={(e) => setLoc('seoTitle', e.target.value)}
              />
            </label>
            <label className="field">
              <span>
                {L('คำอธิบายบน Google', 'Search description')}{' '}
                <Count s={v.seoDescription[tl]} max={170} />
              </span>
              <textarea
                className="inp"
                rows={2}
                maxLength={170}
                value={v.seoDescription[tl]}
                placeholder={v.intro[tl]}
                onChange={(e) => setLoc('seoDescription', e.target.value)}
              />
            </label>
            <PhotoField
              lang={lang}
              label={L('รูปตอนแชร์ (1200×630)', 'Share image (1200×630)')}
              value={v.seoImage}
              media={media}
              onChange={(id) => setV((o) => ({ ...o, seoImage: id }))}
            />
            <div className="serp">
              <small>divepotato.com › {tl} › about</small>
              <b>{seoTitle || L('เกี่ยวกับเรา', 'About us')}</b>
              <span>{seoDesc}</span>
            </div>
          </Section>

          <div className="savebar">{btn(true)}</div>
        </div>

        <aside className="prev">
          <p className="lab">
            <Icon name="eye" />
            {L('ตัวอย่างหน้าเกี่ยวกับเรา', 'About page preview')} · {tl.toUpperCase()}
          </p>
          <article className="artpv">
            <div className="im">
              {img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img.url} alt={img.alt} />
              ) : (
                <span className="noimg">
                  <Icon name="image" />
                </span>
              )}
            </div>
            <div className="bd">
              <h1>{v.title[tl] || v.title.th || (tl === 'en' ? 'About us' : 'เกี่ยวกับเรา')}</h1>
              {v.intro[tl] && <p className="lead">{v.intro[tl]}</p>}
              {v.stats.length > 0 && (
                <div className="statpv">
                  {v.stats.map((r, i) => (
                    <div key={keys[i]}>
                      <b className="num">{r.value || '–'}</b>
                      <small>{r.label[tl] || r.label.th}</small>
                    </div>
                  ))}
                </div>
              )}
              <div className="prose">
                <BlocksPreview blocks={v.content[tl]} byId={media.byId} />
              </div>
            </div>
          </article>
        </aside>
      </div>
    </>
  )
}
