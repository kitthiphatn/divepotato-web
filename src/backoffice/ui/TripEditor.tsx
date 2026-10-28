'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { saveOfferingAction, type OfferingInput } from '../actions/catalog'
import { money } from '../format'
import { CAT_LABEL, CERT_LABEL, pair, translator, type Lang } from '../i18n'
import { Icon } from '../icons'
import { BO } from '../nav'
import { MediaPicker, useLibrary } from './MediaPicker'
import { useToast } from './Toast'

import type { MediaItem } from '../data'
type Loc = 'th' | 'en'

export function TripEditor({
  lang,
  value,
  library,
  defaultDeposit,
}: {
  lang: Lang
  value: OfferingInput
  library: MediaItem[]
  defaultDeposit: number
}) {
  const L = translator(lang)
  const toast = useToast()
  const router = useRouter()
  const [pending, start] = useTransition()
  const [v, setV] = useState(value)
  const [tl, setTl] = useState<Loc>(lang)
  const [picker, setPicker] = useState(false)
  const isTrip = v.kind === 'trip'
  const rows = v.itinerary ?? []
  const media = useLibrary(library)
  const byId = media.byId
  const photos = v.gallery.map((id) => byId.get(id)).filter((m): m is MediaItem => Boolean(m))
  const cover = photos[0]
  const pct =
    isTrip && v.depositPct !== null && v.depositPct !== undefined ? v.depositPct : defaultDeposit
  const dep = Math.round((v.price * pct) / 100)
  const days = isTrip ? Math.max(1, rows.length) : (v.days ?? 1)
  const cat = isTrip ? (v.type ?? 'daytrip') : 'course'
  const en = tl === 'en'

  const patch = (p: Partial<OfferingInput>) => setV((o) => ({ ...o, ...p }))
  const setLoc = (k: 'title' | 'summary' | 'description', text: string) =>
    setV((o) => ({
      ...o,
      [k]: { ...o[k], [tl]: text },
      ...(k === 'description' ? { descriptionDirty: { ...o.descriptionDirty, [tl]: true } } : {}),
    }))
  const setRow = (i: number, k: 'title' | 'text', text: string) =>
    patch({ itinerary: rows.map((r, j) => (j === i ? { ...r, [k]: { ...r[k], [tl]: text } } : r)) })

  const save = () =>
    start(async () => {
      const r = await saveOfferingAction(v)
      toast(r.message, r.ok)
      if (r.ok && !v.id && r.redirect) router.replace(r.redirect)
    })

  const heading =
    (lang === 'en' ? v.title.en || v.title.th : v.title.th || v.title.en) ||
    (isTrip ? L('ทริปใหม่', 'New trip') : L('คอร์สใหม่', 'New course'))

  return (
    <>
      <Link className="back" href={`${BO}/trips`}>
        <Icon name="back" />
        {L('ทริปและคอร์ส', 'Trips & courses')}
      </Link>
      <div className="ph" style={{ marginTop: 4 }}>
        <div>
          <h1>{heading}</h1>
          <p className="lede">
            {L('แก้ไขแล้วดูตัวอย่างด้านขวาได้ทันที', 'Edit and see the preview update instantly')}
          </p>
        </div>
        <div className="acts">
          <Link className="btn o" href={`${BO}/trips`}>
            {L('ยกเลิก', 'Cancel')}
          </Link>
          <button className="btn y" type="button" disabled={pending} onClick={save}>
            <Icon name="check" />
            {v.published
              ? L('บันทึกและเผยแพร่', 'Save & publish')
              : L('บันทึกฉบับร่าง', 'Save draft')}
          </button>
        </div>
      </div>
      <div className="edit">
        <div className="forms">
          <section className="card fsec">
            <h3>
              <span className="no">1</span>
              {L('ข้อมูลพื้นฐาน', 'Basics')}
            </h3>
            <p className="hint">
              {isTrip
                ? L('ประเภท ระดับบัตร และลิงก์', 'Type, level and link')
                : L('รหัสคอร์ส จำนวนวัน และลิงก์', 'Course code, length and link')}
            </p>
            <div className="f3">
              {isTrip ? (
                <>
                  <label className="field">
                    <span>{L('ประเภท', 'Type')}</span>
                    <select
                      className="inp"
                      value={v.type}
                      onChange={(e) => patch({ type: e.target.value as OfferingInput['type'] })}
                    >
                      {(['daytrip', 'liveaboard', 'overseas'] as const).map((k) => (
                        <option key={k} value={k}>
                          {pair(lang, CAT_LABEL[k])}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>{L('ระดับบัตรขั้นต่ำ', 'Level required')}</span>
                    <select
                      className="inp"
                      value={v.levelRequired}
                      onChange={(e) =>
                        patch({ levelRequired: e.target.value as OfferingInput['levelRequired'] })
                      }
                    >
                      {(['none', 'ow', 'aow', 'rescue', 'dm'] as const).map((k) => (
                        <option key={k} value={k}>
                          {k === 'none'
                            ? L('ไม่ต้องมีบัตร', 'No certification')
                            : pair(lang, CERT_LABEL[k])}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : (
                <>
                  <label className="field">
                    <span>{L('รหัสคอร์ส PADI', 'PADI code')}</span>
                    <input
                      className="inp"
                      value={v.padiCode}
                      placeholder="OWD"
                      onChange={(e) => patch({ padiCode: e.target.value })}
                    />
                  </label>
                  <label className="field">
                    <span>{L('จำนวนวัน', 'Days')}</span>
                    <input
                      className="inp num"
                      type="number"
                      min={1}
                      value={v.days}
                      onChange={(e) => patch({ days: Number(e.target.value) || 1 })}
                    />
                  </label>
                </>
              )}
              <label className="field">
                <span>{L('ชื่อในลิงก์ (slug)', 'URL slug')}</span>
                <input
                  className="inp"
                  value={v.slug}
                  placeholder={L('สร้างจากชื่ออังกฤษ', 'From the English title')}
                  onChange={(e) =>
                    patch({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })
                  }
                />
              </label>
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
                        ? L(
                            'ทริปนี้จะแสดงบนเว็บไซต์เมื่อบันทึก',
                            'This will show on the website once saved',
                          )
                        : L(
                            'ทริปนี้จะถูกซ่อนจากเว็บไซต์เมื่อบันทึก',
                            'This will be hidden from the website once saved',
                          ),
                    )
                  }}
                />
                <i />
                <span>{L('แสดงบนหน้าเว็บไซต์', 'Show on website')}</span>
              </label>
            </div>
          </section>

          <section className="card fsec">
            <h3>
              <span className="no">2</span>
              {L('ชื่อและรายละเอียด', 'Name & description')}
            </h3>
            <p className="hint">
              {L(
                'กรอกทั้งภาษาไทยและอังกฤษ ลูกค้าจะเห็นตามภาษาที่เลือก',
                'Fill in Thai and English; customers see their language',
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
                {isTrip ? L('ชื่อทริป', 'Title') : L('ชื่อคอร์ส', 'Title')} ({tl.toUpperCase()})
              </span>
              <input
                className="inp"
                value={v.title[tl]}
                onChange={(e) => setLoc('title', e.target.value)}
              />
            </label>
            <label className="field">
              <span>
                {L('คำโปรยสั้น ๆ', 'Short tagline')} ({tl.toUpperCase()})
              </span>
              <input
                className="inp"
                maxLength={300}
                value={v.summary[tl]}
                onChange={(e) => setLoc('summary', e.target.value)}
              />
            </label>
            <label className="field">
              <span>
                {L('รายละเอียด', 'Description')} ({tl.toUpperCase()})
              </span>
              <textarea
                className="inp"
                rows={5}
                value={v.description[tl]}
                onChange={(e) => setLoc('description', e.target.value)}
              />
            </label>
            <p className="hint" style={{ marginTop: 8 }}>
              {L(
                'ข้อความธรรมดา บรรทัดละย่อหน้า · ตัวหนาหรือลิงก์แก้ได้ใน',
                'Plain text, one paragraph per line · bold or links in',
              )}{' '}
              <Link
                href={`/admin/collections/${isTrip ? 'trips' : 'courses'}${v.id ? `/${v.id}` : ''}`}
              >
                {L('หลังบ้านแบบเต็ม', 'the full admin')}
              </Link>
            </p>
          </section>

          <section className="card fsec">
            <h3>
              <span className="no">3</span>
              {L('ราคาและมัดจำ', 'Price & deposit')}
            </h3>
            <p className="hint">
              {L('ระบบคำนวณยอดมัดจำให้อัตโนมัติ', 'The deposit is calculated for you')}
            </p>
            <div className="f3">
              <label className="field">
                <span>{isTrip ? L('ราคาต่อคน', 'Price per person') : L('ราคา', 'Price')}</span>
                <div className="unit">
                  <input
                    className="inp num"
                    type="number"
                    min={0}
                    step={100}
                    value={v.price}
                    onChange={(e) => patch({ price: Number(e.target.value) || 0 })}
                  />
                  <em>{L('บาท', 'THB')}</em>
                </div>
              </label>
              {isTrip && (
                <label className="field">
                  <span>{L('มัดจำ', 'Deposit')}</span>
                  <div className="unit">
                    <input
                      className="inp num"
                      type="number"
                      min={0}
                      max={100}
                      placeholder={String(defaultDeposit)}
                      value={v.depositPct ?? ''}
                      onChange={(e) =>
                        patch({ depositPct: e.target.value === '' ? null : Number(e.target.value) })
                      }
                    />
                    <em>%</em>
                  </div>
                </label>
              )}
            </div>
            <div className="calc">
              <span>
                {L('มัดจำต่อคน', 'Deposit per person')} <b className="num">{money(dep)}</b>
                {isTrip && (v.depositPct === null || v.depositPct === undefined) && (
                  <span className="muted">
                    {' '}
                    ({L('ค่าเริ่มต้น', 'shop default')} {defaultDeposit}%)
                  </span>
                )}
              </span>
              <span>
                {L('ยอดคงเหลือ', 'Balance')} <b className="num">{money(v.price - dep)}</b>
              </span>
            </div>
          </section>

          {isTrip && (
            <section className="card fsec">
              <h3>
                <span className="no">4</span>
                {L('แผนการเดินทางรายวัน', 'Day-by-day plan')}
              </h3>
              <p className="hint">
                {L('เขียนสั้น ๆ ว่าแต่ละวันทำอะไร', 'A short line for each day')} ·{' '}
                {tl === 'th' ? 'ภาษาไทย' : 'English'}
              </p>
              <div className="days">
                {rows.map((r, i) => (
                  <div className="day" key={r.id ?? `n${i}`}>
                    <span className="dn">
                      {L('วันที่', 'Day')}
                      <b className="num">{i + 1}</b>
                    </span>
                    <div>
                      <input
                        className="inp"
                        value={r.title[tl]}
                        aria-label={`${L('วันที่', 'Day')} ${i + 1}`}
                        placeholder={L('หัวข้อของวันนี้', 'What happens today')}
                        onChange={(e) => setRow(i, 'title', e.target.value)}
                      />
                      <textarea
                        className="inp"
                        value={r.text[tl]}
                        placeholder={L('รายละเอียด (ไม่บังคับ)', 'Details (optional)')}
                        onChange={(e) => setRow(i, 'text', e.target.value)}
                      />
                    </div>
                    <button
                      className="ibtn"
                      type="button"
                      aria-label={L('ลบวัน', 'Remove day')}
                      onClick={() =>
                        rows.length <= 1
                          ? toast(L('ต้องมีอย่างน้อย 1 วัน', 'Keep at least 1 day'), false)
                          : patch({ itinerary: rows.filter((_, j) => j !== i) })
                      }
                    >
                      <Icon name="trash" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                className="btn g sm"
                type="button"
                style={{ marginTop: 12 }}
                onClick={() =>
                  patch({
                    itinerary: [...rows, { title: { th: '', en: '' }, text: { th: '', en: '' } }],
                  })
                }
              >
                <Icon name="plus" />
                {L('เพิ่มวัน', 'Add day')}
              </button>
            </section>
          )}

          <section className="card fsec">
            <h3>
              <span className="no">{isTrip ? 5 : 4}</span>
              {L('รูปภาพ', 'Photos')}
            </h3>
            <p className="hint">
              {L('แตะรูปเพื่อตั้งเป็นรูปปก', 'Tap a photo to make it the cover')}
            </p>
            <div className="pgrid">
              {photos.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  className={i === 0 ? 'cv' : ''}
                  data-cv={L('รูปปก', 'Cover')}
                  onClick={() => {
                    if (i === 0) return
                    patch({ gallery: [p.id, ...v.gallery.filter((x) => x !== p.id)] })
                    toast(L('ตั้งเป็นรูปปกแล้ว', 'Cover photo updated'))
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={p.alt} />
                </button>
              ))}
              <button className="up" type="button" onClick={() => setPicker(true)}>
                <span>
                  <Icon name="image" />
                  {L('เลือกหรืออัปโหลดรูป', 'Pick or upload')}
                </span>
              </button>
            </div>
          </section>
          <div className="savebar">
            <button className="btn y lg" type="button" disabled={pending} onClick={save}>
              <Icon name="check" />
              {v.published
                ? L('บันทึกและเผยแพร่', 'Save & publish')
                : L('บันทึกฉบับร่าง', 'Save draft')}
            </button>
          </div>
        </div>

        <aside className="prev">
          <p className="lab">
            <Icon name="eye" />
            {L('ตัวอย่างบนเว็บไซต์', 'Website preview')} · {tl.toUpperCase()}
          </p>
          <div className="webcard">
            <div className="im">
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover.url} alt={cover.alt} />
              ) : (
                <span className="noimg" style={{ position: 'absolute', inset: 0 }}>
                  <Icon name="image" />
                </span>
              )}
              <span className="bdg">{CAT_LABEL[cat][en ? 1 : 0]}</span>
            </div>
            <div className="bd">
              <span className="pl">
                {isTrip ? CAT_LABEL[cat][en ? 1 : 0] : `PADI${v.padiCode ? ` ${v.padiCode}` : ''}`}
              </span>
              <h4>{v.title[tl] || v.title.th || (en ? 'Untitled' : 'ยังไม่มีชื่อ')}</h4>
              <p className="s">{v.summary[tl]}</p>
              <div className="fx">
                <span>
                  {days} {en ? (days > 1 ? 'days' : 'day') : 'วัน'}
                </span>
                <span>·</span>
                <span>
                  {isTrip && v.levelRequired && v.levelRequired !== 'none'
                    ? CERT_LABEL[v.levelRequired][1]
                    : 'PADI'}
                </span>
              </div>
              <div className="pr">
                <span>
                  <small>{en ? 'From' : 'เริ่มต้น'}</small>
                  <b className="num">{money(v.price)}</b>
                  <small>
                    {en ? 'Deposit' : 'มัดจำ'} {money(dep)}
                  </small>
                </span>
                <span className="wbtn">{en ? 'Book now' : 'จองเลย'}</span>
              </div>
            </div>
          </div>
          {isTrip && rows.length > 0 && (
            <ul className="itin">
              {rows.map((r, i) => (
                <li key={r.id ?? `p${i}`}>
                  <b>
                    {en ? 'Day' : 'วันที่'} {i + 1}
                  </b>
                  <span>{r.title[tl]}</span>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      {picker && (
        <MediaPicker
          lang={lang}
          multiple
          library={media.lib}
          onUploaded={media.add}
          selected={v.gallery}
          onChange={(gallery) => patch({ gallery })}
          onClose={() => setPicker(false)}
          title={L('เลือกรูปจากคลังรูป', 'Pick photos from media')}
          hint={L(
            'แตะเพื่อเพิ่มหรือเอาออก รูปแรกคือรูปปก',
            'Tap to add or remove; the first photo is the cover',
          )}
        />
      )}
    </>
  )
}
