'use client'

import { useState, useTransition } from 'react'

import { saveCookieAction, type CookieInput } from '../actions/site'
import { translator, type Lang } from '../i18n'
import { Icon } from '../icons'
import { WebsiteHead } from './fields'
import { useToast } from './Toast'

// Cookie banner text (TH/EN) and the privacy policy link, with a preview of the banner
export function CookieForm({ lang, value }: { lang: Lang; value: CookieInput }) {
  const L = translator(lang)
  const toast = useToast()
  const [pending, start] = useTransition()
  const [v, setV] = useState(value)
  const [pv, setPv] = useState<'th' | 'en'>(lang)
  const save = () =>
    start(async () => {
      const r = await saveCookieAction(v)
      toast(r.message, r.ok)
    })
  const setMsg = (l: 'th' | 'en', x: string) =>
    setV((o) => ({ ...o, message: { ...o.message, [l]: x } }))
  const en = pv === 'en'

  return (
    <>
      <WebsiteHead
        lang={lang}
        tab="cookie"
        lede={L(
          'แถบแจ้งเรื่องคุกกี้ที่ลูกค้าเห็นตอนเข้าเว็บครั้งแรก',
          'The cookie notice visitors see on their first visit',
        )}
        acts={
          <button className="btn y" type="button" disabled={pending} onClick={save}>
            <Icon name="check" />
            {L('บันทึกและเผยแพร่', 'Save & publish')}
          </button>
        }
      />
      <section className="card fsec" style={{ maxWidth: 760 }}>
        <label className="field">
          <span>{L('ข้อความ (ไทย)', 'Message (Thai)')}</span>
          <textarea
            className="inp"
            rows={3}
            value={v.message.th}
            onFocus={() => setPv('th')}
            onChange={(e) => setMsg('th', e.target.value)}
          />
        </label>
        <label className="field">
          <span>{L('ข้อความ (อังกฤษ)', 'Message (English)')}</span>
          <textarea
            className="inp"
            rows={3}
            value={v.message.en}
            onFocus={() => setPv('en')}
            onChange={(e) => setMsg('en', e.target.value)}
          />
        </label>
        <label className="field">
          <span>{L('ลิงก์นโยบายความเป็นส่วนตัว', 'Privacy policy link')}</span>
          <input
            className="inp"
            value={v.policyUrl}
            placeholder="/th/privacy"
            onChange={(e) => setV((o) => ({ ...o, policyUrl: e.target.value }))}
          />
        </label>
        <div className="annpv ckpv">
          <div className="site">
            {L('ตัวอย่างหน้าเว็บ', 'Website preview')} · {pv.toUpperCase()}
          </div>
          <div className="ck">
            <p>
              {v.message[pv] || v.message.th}{' '}
              {v.policyUrl && <u>{en ? 'Privacy policy' : 'นโยบายความเป็นส่วนตัว'}</u>}
            </p>
            <span className="btn y sm">{en ? 'Accept' : 'ยอมรับ'}</span>
          </div>
        </div>
      </section>
    </>
  )
}
