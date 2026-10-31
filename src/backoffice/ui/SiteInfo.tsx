'use client'

import { useState, useTransition } from 'react'

import { saveSiteSettingsAction, type SiteSettingsInput } from '../actions/site'
import type { MediaItem } from '../data'
import { translator, type Lang } from '../i18n'
import { Icon } from '../icons'
import { LocTabs, PhotoField, Section, WebsiteHead, type Loc } from './fields'
import { useLibrary } from './MediaPicker'
import { useToast } from './Toast'

type C = SiteSettingsInput['contact']
const SOCIALS: [keyof C, string, string][] = [
  ['facebookUrl', 'Facebook', 'https://facebook.com/…'],
  ['instagramUrl', 'Instagram', 'https://instagram.com/…'],
  ['tiktokUrl', 'TikTok', 'https://tiktok.com/@…'],
  ['youtubeUrl', 'YouTube', 'https://youtube.com/@…'],
  ['whatsappUrl', 'WhatsApp', 'https://wa.me/66…'],
]

// Shop info (the site-settings global): name, logo, contact and socials, the fallback home
// hero, footer note and Google Analytics, with a live footer preview
export function SiteInfoForm({
  lang,
  value,
  library,
}: {
  lang: Lang
  value: SiteSettingsInput
  library: MediaItem[]
}) {
  const L = translator(lang)
  const toast = useToast()
  const [pending, start] = useTransition()
  const [v, setV] = useState(value)
  const [tl, setTl] = useState<Loc>(lang)
  const media = useLibrary(library)

  const setC = (k: keyof C, x: string) => setV((o) => ({ ...o, contact: { ...o.contact, [k]: x } }))
  const setCLoc = (k: 'hours' | 'address', x: string) =>
    setV((o) => ({ ...o, contact: { ...o.contact, [k]: { ...o.contact[k], [tl]: x } } }))
  const setHero = (k: 'title' | 'subtitle', x: string) =>
    setV((o) => ({ ...o, hero: { ...o.hero, [k]: { ...o.hero[k], [tl]: x } } }))
  const plain = (k: keyof C) => ({
    value: v.contact[k] as string,
    onChange: (e: { target: { value: string } }) => setC(k, e.target.value),
  })

  const save = () =>
    start(async () => {
      const r = await saveSiteSettingsAction(v)
      toast(r.message, r.ok)
    })
  const saveBtn = (
    <button className="btn y" type="button" disabled={pending} onClick={save}>
      <Icon name="check" />
      {L('บันทึกและเผยแพร่', 'Save & publish')}
    </button>
  )
  const logo = v.logo ? media.byId.get(v.logo) : undefined
  const pick = (p: { th: string; en: string }) => p[tl] || p.th || p.en
  const socials = SOCIALS.filter(([k]) => (v.contact[k] as string).trim())

  return (
    <>
      <WebsiteHead
        lang={lang}
        tab="site"
        lede={L(
          'ชื่อร้าน โลโก้ ช่องทางติดต่อ และค่าพื้นฐานของเว็บไซต์',
          'Shop name, logo, contact details and site defaults',
        )}
        acts={saveBtn}
      />
      <div className="edit">
        <div className="forms">
          <Section
            no={1}
            title={L('ชื่อร้านและโลโก้', 'Name & logo')}
            hint={L(
              'แสดงบนแถบเมนู แท็บเบราว์เซอร์ และท้ายเว็บ',
              'Shown in the menu bar, browser tab and footer',
            )}
          >
            <LocTabs tl={tl} onChange={setTl} />
            <label className="field">
              <span>
                {L('ชื่อเว็บไซต์', 'Site name')} ({tl.toUpperCase()})
              </span>
              <input
                className="inp"
                value={v.siteName[tl]}
                onChange={(e) =>
                  setV((o) => ({ ...o, siteName: { ...o.siteName, [tl]: e.target.value } }))
                }
              />
            </label>
            <div className="f2">
              <PhotoField
                lang={lang}
                label={L('โลโก้', 'Logo')}
                value={v.logo}
                ratio="square"
                media={media}
                onChange={(id) => setV((o) => ({ ...o, logo: id }))}
                hint={L(
                  'ใช้ PNG พื้นใส หรือ SVG สูงอย่างน้อย 80px',
                  'A transparent PNG or SVG, at least 80px tall',
                )}
              />
              <PhotoField
                lang={lang}
                label={L('ไอคอนแท็บเบราว์เซอร์ (favicon)', 'Browser tab icon (favicon)')}
                value={v.favicon}
                ratio="square"
                media={media}
                onChange={(id) => setV((o) => ({ ...o, favicon: id }))}
                hint={L('รูปสี่เหลี่ยมจัตุรัส', 'A square image')}
              />
            </div>
          </Section>

          <Section
            no={2}
            title={L('ช่องทางติดต่อ', 'Contact')}
            hint={L(
              'ลูกค้าเห็นในหน้าติดต่อและท้ายเว็บ',
              'Shown on the contact page and in the footer',
            )}
          >
            <div className="f3">
              <label className="field">
                <span>{L('เบอร์โทร', 'Phone')}</span>
                <input className="inp num" type="tel" {...plain('phone')} />
              </label>
              <label className="field">
                <span>{L('อีเมล', 'Email')}</span>
                <input className="inp" type="email" {...plain('email')} />
              </label>
              <label className="field">
                <span>LINE ID</span>
                <input className="inp" placeholder="@divepotato" {...plain('lineId')} />
              </label>
            </div>
            <label className="field">
              <span>{L('ลิงก์ LINE', 'LINE link')}</span>
              <input className="inp" placeholder="https://line.me/R/ti/p/…" {...plain('lineUrl')} />
            </label>
            <LocTabs tl={tl} onChange={setTl} />
            <label className="field">
              <span>
                {L('เวลาทำการ', 'Opening hours')} ({tl.toUpperCase()})
              </span>
              <input
                className="inp"
                value={v.contact.hours[tl]}
                placeholder={L('ทุกวัน 08:00-18:00', 'Daily 08:00-18:00')}
                onChange={(e) => setCLoc('hours', e.target.value)}
              />
            </label>
            <label className="field">
              <span>
                {L('ที่อยู่ร้าน', 'Shop address')} ({tl.toUpperCase()})
              </span>
              <textarea
                className="inp"
                rows={3}
                value={v.contact.address[tl]}
                onChange={(e) => setCLoc('address', e.target.value)}
              />
            </label>
            <label className="field">
              <span>{L('พิกัดแผนที่ (ไทย/อังกฤษใช้ร่วมกัน)', 'Map location (shared TH/EN)')}</span>
              <input
                className="inp num"
                placeholder="13.8377, 100.6035"
                {...plain('mapLocation')}
              />
              <small className="hint">
                {L(
                  'ใน Google Maps คลิกขวาที่ร้าน แล้วกดตัวเลขพิกัดบนสุดเพื่อคัดลอกมาวาง',
                  'In Google Maps, right-click the shop and click the numbers at the top to copy them',
                )}
              </small>
            </label>
          </Section>

          <Section
            no={3}
            title={L('โซเชียลมีเดีย', 'Social media')}
            hint={L(
              'เว้นว่างช่องที่ไม่ใช้ · ลิงก์เต็ม https://',
              'Leave unused ones empty · full https:// links',
            )}
          >
            <div className="f2">
              {SOCIALS.map(([k, label, ph]) => (
                <label key={k} className="field">
                  <span>{label}</span>
                  <input className="inp" placeholder={ph} spellCheck={false} {...plain(k)} />
                </label>
              ))}
            </div>
          </Section>

          <Section
            no={4}
            title={L('ส่วนหัวหน้าแรก (สำรอง)', 'Home hero (fallback)')}
            hint={L(
              'ใช้เมื่อยังไม่มีสไลด์หน้าแรก · สไลด์แก้ได้ที่แท็บสไลด์หน้าแรก',
              'Used when there are no home slides · slides live in the Home slides tab',
            )}
          >
            <LocTabs tl={tl} onChange={setTl} />
            <label className="field">
              <span>
                {L('หัวข้อ', 'Title')} ({tl.toUpperCase()})
              </span>
              <input
                className="inp"
                value={v.hero.title[tl]}
                onChange={(e) => setHero('title', e.target.value)}
              />
            </label>
            <label className="field">
              <span>
                {L('คำโปรย', 'Subtitle')} ({tl.toUpperCase()})
              </span>
              <textarea
                className="inp"
                rows={2}
                value={v.hero.subtitle[tl]}
                onChange={(e) => setHero('subtitle', e.target.value)}
              />
            </label>
            <PhotoField
              lang={lang}
              label={L('รูปพื้นหลัง', 'Background image')}
              value={v.hero.background}
              media={media}
              onChange={(id) => setV((o) => ({ ...o, hero: { ...o.hero, background: id } }))}
            />
          </Section>

          <Section
            no={5}
            title={L('ท้ายเว็บและสถิติ', 'Footer & analytics')}
            hint={L('ข้อความท้ายเว็บและ Google Analytics', 'Footer text and Google Analytics')}
          >
            <LocTabs tl={tl} onChange={setTl} />
            <label className="field">
              <span>
                {L('ข้อความท้ายเว็บ', 'Footer note')} ({tl.toUpperCase()})
              </span>
              <textarea
                className="inp"
                rows={2}
                value={v.footerNote[tl]}
                onChange={(e) =>
                  setV((o) => ({ ...o, footerNote: { ...o.footerNote, [tl]: e.target.value } }))
                }
              />
            </label>
            <label className="field">
              <span>{L('รหัส Google Analytics', 'Google Analytics ID')}</span>
              <input
                className="inp num"
                placeholder="G-XXXXXXXXXX"
                spellCheck={false}
                value={v.analyticsId}
                onChange={(e) => setV((o) => ({ ...o, analyticsId: e.target.value.toUpperCase() }))}
              />
              <small className="hint">
                {L(
                  'Measurement ID ของ GA4 เว้นว่างไว้ถ้าไม่ใช้',
                  'GA4 Measurement ID. Leave empty to turn off.',
                )}
              </small>
            </label>
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
            {L('ตัวอย่างท้ายเว็บ', 'Footer preview')} · {tl.toUpperCase()}
          </p>
          <div className="footpv">
            <div className="fb">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo.url} alt="" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src="/backoffice/logo.png" alt="" />
              )}
              <b>{pick(v.siteName) || 'Dive Potato'}</b>
            </div>
            {pick(v.footerNote) && <p className="fn">{pick(v.footerNote)}</p>}
            <ul>
              {v.contact.phone && (
                <li>
                  <Icon name="phone" />
                  {v.contact.phone}
                </li>
              )}
              {v.contact.lineId && (
                <li>
                  <Icon name="chat" />
                  LINE {v.contact.lineId}
                </li>
              )}
              {v.contact.email && (
                <li>
                  <Icon name="mail" />
                  {v.contact.email}
                </li>
              )}
              {pick(v.contact.hours) && (
                <li>
                  <Icon name="clock" />
                  {pick(v.contact.hours)}
                </li>
              )}
              {pick(v.contact.address) && (
                <li>
                  <Icon name="map" />
                  <span style={{ whiteSpace: 'pre-line' }}>{pick(v.contact.address)}</span>
                </li>
              )}
            </ul>
            {socials.length > 0 && (
              <div className="soc">
                {socials.map(([k, label]) => (
                  <span key={k}>{label}</span>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </>
  )
}
