'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { savePostAction, type PostInput } from '../actions/posts'
import { plainInline, type Block } from '../blocks'
import type { MediaItem } from '../data'
import { fd, slugify } from '../format'
import { pair, POST_CAT_LABEL, POST_CATEGORIES, translator, type Lang } from '../i18n'
import { Icon } from '../icons'
import { BO } from '../nav'
import { BlockEditor, BlocksPreview } from './BlockEditor'
import { MediaPicker, useLibrary } from './MediaPicker'
import { useToast } from './Toast'

type Loc = 'th' | 'en'
const LIST = `${BO}/website?tab=articles`

export function ArticleEditor({
  lang,
  value,
  library,
  lossy,
}: {
  lang: Lang
  value: PostInput
  library: MediaItem[]
  lossy: { th: boolean; en: boolean }
}) {
  const L = translator(lang)
  const toast = useToast()
  const router = useRouter()
  const [pending, start] = useTransition()
  const [v, setV] = useState(value)
  const [tl, setTl] = useState<Loc>(lang)
  const [coverPicker, setCoverPicker] = useState(false)
  const [slugAuto, setSlugAuto] = useState(!value.id && !value.slug)
  const media = useLibrary(library)
  const cover = v.cover ? media.byId.get(v.cover) : undefined
  const en = tl === 'en'

  const patch = (p: Partial<PostInput>) => setV((o) => ({ ...o, ...p }))
  type LocKey = 'title' | 'excerpt' | 'seoTitle' | 'seoDescription'
  const setLoc = (k: LocKey, text: string) =>
    setV((o) => ({
      ...o,
      [k]: { ...o[k], [tl]: text },
      ...(k === 'title' && tl === 'en' && slugAuto ? { slug: slugify(text) } : {}),
    }))
  const setBody = (blocks: Block[]) =>
    setV((o) => ({
      ...o,
      body: { ...o.body, [tl]: blocks },
      bodyDirty: { ...o.bodyDirty, [tl]: true },
    }))

  const save = () =>
    start(async () => {
      const r = await savePostAction(v)
      toast(r.message, r.ok)
      if (!r.ok) return
      // The saved body is now the reference for "unchanged"
      setV((o) => ({ ...o, bodyDirty: { th: false, en: false } }))
      if (!v.id && r.redirect) router.replace(r.redirect)
    })

  const heading =
    (lang === 'en' ? v.title.en || v.title.th : v.title.th || v.title.en) ||
    L('บทความใหม่', 'New article')
  const saveLabel = v.published
    ? L('บันทึกและเผยแพร่', 'Save & publish')
    : L('บันทึกฉบับร่าง', 'Save draft')
  const seoTitle = v.seoTitle[tl] || v.title[tl] || v.title.th
  const seoDesc =
    v.seoDescription[tl] ||
    v.excerpt[tl] ||
    plainInline(v.body[tl].find((b) => b.kind === 'p')?.text ?? '').slice(0, 160)
  const count = (s: string, max: number) => (
    <em className={`cnt${s.length > max ? ' over' : ''}`}>
      {s.length}/{max}
    </em>
  )

  return (
    <>
      <Link className="back" href={LIST}>
        <Icon name="back" />
        {L('บทความ', 'Articles')}
      </Link>
      <div className="ph" style={{ marginTop: 4 }}>
        <div>
          <h1>{heading}</h1>
          <p className="lede">
            {L(
              'เขียนแล้วดูตัวอย่างบทความด้านขวาได้ทันที',
              'Write and see the article preview update instantly',
            )}
          </p>
        </div>
        <div className="acts">
          <Link className="btn o" href={LIST}>
            {L('ยกเลิก', 'Cancel')}
          </Link>
          <button className="btn y" type="button" disabled={pending} onClick={save}>
            <Icon name="check" />
            {saveLabel}
          </button>
        </div>
      </div>
      <div className="edit art">
        <div className="forms">
          <section className="card fsec">
            <h3>
              <span className="no">1</span>
              {L('ข้อมูลบทความ', 'Article details')}
            </h3>
            <p className="hint">
              {L('หมวด วันที่ ลิงก์ และรูปปก', 'Category, date, link and cover')}
            </p>
            <div className="f3">
              <label className="field">
                <span>{L('หมวด', 'Category')}</span>
                <select
                  className="inp"
                  value={v.category}
                  onChange={(e) => patch({ category: e.target.value as PostInput['category'] })}
                >
                  {POST_CATEGORIES.map((k) => (
                    <option key={k} value={k}>
                      {pair(lang, POST_CAT_LABEL[k])}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{L('วันที่เผยแพร่', 'Publish date')}</span>
                <input
                  className="inp"
                  type="date"
                  value={v.date}
                  onChange={(e) => patch({ date: e.target.value })}
                />
              </label>
              <label className="field">
                <span>{L('ชื่อในลิงก์ (slug)', 'URL slug')}</span>
                <input
                  className="inp"
                  value={v.slug}
                  placeholder={L('สร้างจากหัวข้ออังกฤษ', 'From the English title')}
                  onChange={(e) => {
                    setSlugAuto(false)
                    patch({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })
                  }}
                />
              </label>
            </div>
            <span className="field" style={{ marginBottom: 0 }}>
              <span>{L('รูปปก (16:9)', 'Cover photo (16:9)')}</span>
            </span>
            <div className="covpick">
              <button type="button" className="cvb" onClick={() => setCoverPicker(true)}>
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cover.url} alt={cover.alt} />
                ) : (
                  <span className="noimg">
                    <Icon name="image" />
                  </span>
                )}
              </button>
              <span className="cvact">
                <button className="btn o sm" type="button" onClick={() => setCoverPicker(true)}>
                  <Icon name="image" />
                  {cover
                    ? L('เปลี่ยนรูปปก', 'Change cover')
                    : L('เลือกหรืออัปโหลดรูป', 'Pick or upload')}
                </button>
                {cover && (
                  <button className="btn t sm" type="button" onClick={() => patch({ cover: null })}>
                    <Icon name="x" />
                    {L('เอารูปออก', 'Remove')}
                  </button>
                )}
              </span>
            </div>
            <div style={{ marginTop: 18 }}>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={v.published}
                  onChange={(e) => {
                    patch({ published: e.target.checked })
                    toast(
                      e.target.checked
                        ? L('บทความจะแสดงบนเว็บไซต์เมื่อบันทึก', 'This will go live once saved')
                        : L('บทความจะเป็นฉบับร่างเมื่อบันทึก', 'This will be a draft once saved'),
                    )
                  }}
                />
                <i />
                <span>{L('เผยแพร่บนเว็บไซต์', 'Publish on website')}</span>
              </label>
            </div>
          </section>

          <section className="card fsec">
            <h3>
              <span className="no">2</span>
              {L('หัวข้อและเนื้อหา', 'Title & content')}
            </h3>
            <p className="hint">
              {L(
                'เขียนทั้งภาษาไทยและอังกฤษ ลูกค้าจะเห็นตามภาษาที่เลือก',
                'Write Thai and English; readers see their language',
              )}
            </p>
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
                value={v.title[tl]}
                onChange={(e) => setLoc('title', e.target.value)}
              />
            </label>
            <label className="field">
              <span>
                {L('คำโปรย', 'Summary')} ({tl.toUpperCase()}) {count(v.excerpt[tl], 240)}
              </span>
              <textarea
                className="inp"
                rows={2}
                maxLength={240}
                value={v.excerpt[tl]}
                onChange={(e) => setLoc('excerpt', e.target.value)}
              />
            </label>
            <span className="field" style={{ marginBottom: 6 }}>
              <span>
                {L('เนื้อหา', 'Content')} ({tl.toUpperCase()})
              </span>
            </span>
            {lossy[tl] && !v.bodyDirty[tl] && (
              <p className="banner amb small" style={{ marginBottom: 10 }}>
                <Icon name="alert" />
                {L(
                  'บทความนี้มีรูปแบบพิเศษบางอย่าง ถ้าแก้เนื้อหาภาษานี้ ข้อความจะยังอยู่ครบแต่รูปแบบพิเศษจะถูกปรับให้เรียบง่าย',
                  'This article has some special formatting. Editing this language keeps all text but simplifies that formatting.',
                )}
              </p>
            )}
            <BlockEditor
              key={tl}
              lang={lang}
              label={L('ตัวแก้ไขเนื้อหา', 'Content editor')}
              blocks={v.body[tl]}
              onChange={setBody}
              media={media}
            />
          </section>

          <section className="card fsec">
            <h3>
              <span className="no">3</span>
              SEO
            </h3>
            <p className="hint">
              {L(
                'เว้นว่างได้ ระบบจะใช้หัวข้อและคำโปรยแทน',
                'Optional; the title and summary are used when empty',
              )}{' '}
              · {tl === 'th' ? 'ภาษาไทย' : 'English'}
            </p>
            <label className="field">
              <span>
                {L('หัวข้อบน Google', 'Search title')} {count(v.seoTitle[tl], 70)}
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
                {L('คำอธิบายบน Google', 'Search description')} {count(v.seoDescription[tl], 170)}
              </span>
              <textarea
                className="inp"
                rows={2}
                maxLength={170}
                value={v.seoDescription[tl]}
                placeholder={v.excerpt[tl]}
                onChange={(e) => setLoc('seoDescription', e.target.value)}
              />
            </label>
            <div className="serp">
              <small>
                divepotato.com › {tl} › blog › {v.slug || '…'}
              </small>
              <b>{seoTitle || L('หัวข้อบทความ', 'Article title')}</b>
              <span>{seoDesc}</span>
            </div>
          </section>

          <div className="savebar">
            <button className="btn y lg" type="button" disabled={pending} onClick={save}>
              <Icon name="check" />
              {saveLabel}
            </button>
          </div>
        </div>

        <aside className="prev">
          <p className="lab">
            <Icon name="eye" />
            {L('ตัวอย่างบทความ', 'Article preview')} · {tl.toUpperCase()}
          </p>
          <article className="artpv">
            <div className="im">
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover.url} alt={cover.alt} />
              ) : (
                <span className="noimg">
                  <Icon name="image" />
                </span>
              )}
            </div>
            <div className="bd">
              <span className="pl">
                {POST_CAT_LABEL[v.category][en ? 1 : 0]} · {v.date ? fd(v.date, tl) : ''}
                {!v.published && (
                  <span className="pill st-hold" style={{ marginLeft: 8 }}>
                    {en ? 'Draft' : 'ฉบับร่าง'}
                  </span>
                )}
              </span>
              <h1>{v.title[tl] || v.title.th || (en ? 'Untitled' : 'ยังไม่มีหัวข้อ')}</h1>
              {v.excerpt[tl] && <p className="lead">{v.excerpt[tl]}</p>}
              <div className="prose">
                <BlocksPreview blocks={v.body[tl]} byId={media.byId} />
              </div>
            </div>
          </article>
        </aside>
      </div>

      {coverPicker && (
        <MediaPicker
          lang={lang}
          library={media.lib}
          onUploaded={media.add}
          selected={v.cover ? [v.cover] : []}
          onChange={(ids) => patch({ cover: ids[0] ?? null })}
          onClose={() => setCoverPicker(false)}
          title={L('รูปปกบทความ', 'Article cover')}
          hint={L('แนะนำรูปแนวนอน 16:9', 'A landscape 16:9 photo works best')}
        />
      )}
    </>
  )
}
