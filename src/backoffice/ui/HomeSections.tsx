'use client'

import { useState, useTransition } from 'react'

import { saveHomeSectionsAction, type HomeSectionsInput } from '../actions/site'
import { translator, type Lang } from '../i18n'
import { Icon } from '../icons'
import { SERVICE_ICON, SERVICE_ICON_KEYS, type ServiceIcon } from '../website'
import { LocTabs, Section, WebsiteHead, type Loc } from './fields'
import { useToast } from './Toast'

type Row = HomeSectionsInput['services'][number]
const blank = (): Row => ({
  id: null,
  icon: 'mask',
  title: { th: '', en: '' },
  text: { th: '', en: '' },
})

// The home page sections around the hero slides: the highlight cards and which blocks show
export function HomeSectionsForm({ lang, value }: { lang: Lang; value: HomeSectionsInput }) {
  const L = translator(lang)
  const toast = useToast()
  const [pending, start] = useTransition()
  const [v, setV] = useState(value)
  const [tl, setTl] = useState<Loc>(lang)
  // Rows keep a stable key for React even before they have an id
  const [keys, setKeys] = useState(() => value.services.map((r, i) => r.id ?? `n${i}`))

  const setRow = (i: number, p: Partial<Row>) =>
    setV((o) => ({ ...o, services: o.services.map((r, j) => (j === i ? { ...r, ...p } : r)) }))
  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= v.services.length) return
    const swap = <T,>(xs: T[]) => {
      const n = [...xs]
      ;[n[i], n[j]] = [n[j], n[i]]
      return n
    }
    setV((o) => ({ ...o, services: swap(o.services) }))
    setKeys(swap)
  }
  const remove = (i: number) => {
    setV((o) => ({ ...o, services: o.services.filter((_, j) => j !== i) }))
    setKeys((k) => k.filter((_, j) => j !== i))
  }
  const add = () => {
    setV((o) => ({ ...o, services: [...o.services, blank()] }))
    setKeys((k) => [...k, `n${Date.now()}`])
  }
  const save = () =>
    start(async () => {
      const r = await saveHomeSectionsAction(v)
      toast(r.message, r.ok)
    })

  const toggles: [keyof HomeSectionsInput, string, string, string, string][] = [
    ['showTrips', 'แสดงทริป', 'Show trips', 'การ์ดทริปที่เปิดขาย', 'Trip cards on sale'],
    ['showCourses', 'แสดงคอร์สเรียน', 'Show courses', 'คอร์ส PADI', 'PADI courses'],
    ['showNews', 'แสดงบทความล่าสุด', 'Show latest posts', 'บทความ 3 เรื่องล่าสุด', 'The 3 newest articles'],
    [
      'showFaq',
      'แสดงคำถามที่พบบ่อย',
      'Show FAQs',
      'คำถามที่ติ๊ก "แสดงในหน้าแรก"',
      'FAQs marked "show on home"',
    ],
  ]
  const txt = (p: { th: string; en: string }) => p[tl] || p.th || p.en

  return (
    <>
      <WebsiteHead
        lang={lang}
        tab="home"
        lede={L(
          'จุดเด่นของร้านและส่วนที่แสดงบนหน้าแรก (สไลด์อยู่ในแท็บสไลด์หน้าแรก)',
          'Shop highlights and which sections the home page shows (slides have their own tab)',
        )}
        acts={
          <button className="btn y" type="button" disabled={pending} onClick={save}>
            <Icon name="check" />
            {L('บันทึกและเผยแพร่', 'Save & publish')}
          </button>
        }
      />
      <div className="edit">
        <div className="forms">
          <Section
            no={1}
            title={L('จุดเด่นของร้าน', 'Highlights')}
            hint={L(
              'การ์ดสั้น ๆ ใต้สไลด์หน้าแรก สูงสุด 6 ข้อ',
              'Short cards below the home slides, up to 6',
            )}
            aside={
              v.services.length < 6 ? (
                <button className="btn g sm" type="button" onClick={add}>
                  <Icon name="plus" />
                  {L('เพิ่มจุดเด่น', 'Add highlight')}
                </button>
              ) : null
            }
          >
            <LocTabs tl={tl} onChange={setTl} />
            {v.services.length === 0 && (
              <p className="muted small">{L('ยังไม่มีจุดเด่น', 'No highlights yet')}</p>
            )}
            <div className="hlist">
              {v.services.map((r, i) => (
                <div key={keys[i]} className="hrow">
                  <div className="hh">
                    <span className="hic">
                      <Icon name={SERVICE_ICON[r.icon]?.icon ?? 'mask'} />
                    </span>
                    <select
                      className="inp"
                      value={r.icon}
                      aria-label={L('ไอคอน', 'Icon')}
                      onChange={(e) => setRow(i, { icon: e.target.value as ServiceIcon })}
                    >
                      {SERVICE_ICON_KEYS.map((k) => (
                        <option key={k} value={k}>
                          {L(SERVICE_ICON[k].th, SERVICE_ICON[k].en)}
                        </option>
                      ))}
                    </select>
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
                        disabled={i === v.services.length - 1}
                        onClick={() => move(i, 1)}
                        aria-label={L('เลื่อนลง', 'Move down')}
                      >
                        <Icon name="back" className="down" />
                      </button>
                      <button
                        className="ibtn"
                        type="button"
                        onClick={() => remove(i)}
                        aria-label={L('ลบจุดเด่น', 'Remove highlight')}
                      >
                        <Icon name="trash" />
                      </button>
                    </span>
                  </div>
                  <label className="field">
                    <span>
                      {L('หัวข้อ', 'Title')} ({tl.toUpperCase()})
                    </span>
                    <input
                      className="inp"
                      value={r.title[tl]}
                      onChange={(e) => setRow(i, { title: { ...r.title, [tl]: e.target.value } })}
                    />
                  </label>
                  <label className="field" style={{ marginBottom: 0 }}>
                    <span>
                      {L('คำอธิบาย', 'Description')} ({tl.toUpperCase()})
                    </span>
                    <textarea
                      className="inp"
                      rows={2}
                      value={r.text[tl]}
                      onChange={(e) => setRow(i, { text: { ...r.text, [tl]: e.target.value } })}
                    />
                  </label>
                </div>
              ))}
            </div>
          </Section>

          <Section
            no={2}
            title={L('ส่วนที่แสดงบนหน้าแรก', 'Sections on the home page')}
            hint={L('ปิดส่วนที่ยังไม่พร้อม', 'Turn off sections that are not ready')}
          >
            {toggles.map(([k, th, en, dth, den]) => (
              <div key={k} className="tog">
                <span>
                  <b>{L(th, en)}</b>
                  <span>{L(dth, den)}</span>
                </span>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={Boolean(v[k])}
                    onChange={(e) => setV((o) => ({ ...o, [k]: e.target.checked }))}
                  />
                  <i />
                  <span className="sr">{L(th, en)}</span>
                </label>
              </div>
            ))}
          </Section>

          <div className="savebar">
            <button className="btn y lg" type="button" disabled={pending} onClick={save}>
              <Icon name="check" />
              {L('บันทึกและเผยแพร่', 'Save & publish')}
            </button>
          </div>
        </div>

        <aside className="prev">
          <p className="lab">
            <Icon name="eye" />
            {L('ตัวอย่างหน้าแรก', 'Home preview')} · {tl.toUpperCase()}
          </p>
          <div className="homepv">
            <div className="hs">{tl === 'en' ? 'Hero slides' : 'สไลด์หน้าแรก'}</div>
            {v.services.length > 0 && (
              <div className="hgrid">
                {v.services.map((r, i) => (
                  <div key={keys[i]}>
                    <Icon name={SERVICE_ICON[r.icon]?.icon ?? 'mask'} />
                    <b>{txt(r.title) || '…'}</b>
                    {txt(r.text) && <small>{txt(r.text)}</small>}
                  </div>
                ))}
              </div>
            )}
            {(
              [
                ['showTrips', 'ทริปดำน้ำ', 'Dive trips'],
                ['showCourses', 'คอร์ส PADI', 'PADI courses'],
                ['showNews', 'บทความล่าสุด', 'Latest posts'],
                ['showFaq', 'คำถามที่พบบ่อย', 'FAQs'],
              ] as const
            ).map(([k, th, en]) => (
              <div key={k} className={`hsec${v[k] ? '' : ' off'}`}>
                {tl === 'en' ? en : th}
                {!v[k] && <em>{L('ซ่อน', 'hidden')}</em>}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </>
  )
}
