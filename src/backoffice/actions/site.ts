'use server'

// Website globals edited in the backoffice Website section: shop info (site-settings), the home
// page sections, the About page, the popup and the cookie banner. Thai is saved first, then
// English; array rows keep their ids so both languages land on the same rows.
import { revalidatePath } from 'next/cache'

import { BO } from '../nav'
import { actionUser, errorMessage, isSession, type ActionResult } from '../server'

type Pair = { th: string; en: string }
const CONTENT = ['admin', 'editor'] as const
const opt = (v: string | null | undefined) => (v ?? '').trim() || null
const both = (p: Pair) => p.th.trim() || p.en.trim()

const done = (message: string): ActionResult => {
  revalidatePath(BO, 'layout')
  return { ok: true, message }
}

// ---------- shop info (site-settings) ----------

export type SiteSettingsInput = {
  siteName: Pair
  logo: number | null
  favicon: number | null
  contact: {
    phone: string
    lineId: string
    lineUrl: string
    email: string
    whatsappUrl: string
    facebookUrl: string
    instagramUrl: string
    tiktokUrl: string
    youtubeUrl: string
    hours: Pair
    address: Pair
  }
  hero: { title: Pair; subtitle: Pair; background: number | null }
  footerNote: Pair
  analyticsId: string
}

const URL_KEYS = [
  'lineUrl',
  'whatsappUrl',
  'facebookUrl',
  'instagramUrl',
  'tiktokUrl',
  'youtubeUrl',
] as const

export async function saveSiteSettingsAction(v: SiteSettingsInput): Promise<ActionResult> {
  const s = await actionUser([...CONTENT])
  if (!isSession(s)) return s
  const { L } = s
  const ga = v.analyticsId.trim()
  if (ga && !/^G-[A-Z0-9]{4,}$/.test(ga))
    return {
      ok: false,
      message: L('รหัส Google Analytics ต้องขึ้นต้นด้วย G-', 'The Analytics ID must start with G-'),
    }
  const email = v.contact.email.trim()
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { ok: false, message: L('อีเมลไม่ถูกต้อง', 'The email address is not valid') }
  for (const k of URL_KEYS) {
    const u = v.contact[k].trim()
    if (u && !/^https?:\/\//i.test(u))
      return {
        ok: false,
        message: L(
          'ลิงก์โซเชียลต้องขึ้นต้นด้วย https://',
          'Social links must start with https://',
        ),
      }
  }
  const c = v.contact
  try {
    await s.payload.updateGlobal({
      slug: 'site-settings',
      locale: 'th',
      depth: 0,
      data: {
        siteName: both(v.siteName) || 'Dive Potato Scuba Diving',
        logo: v.logo,
        favicon: v.favicon,
        contact: {
          phone: opt(c.phone),
          lineId: opt(c.lineId),
          lineUrl: opt(c.lineUrl),
          email: email || null,
          whatsappUrl: opt(c.whatsappUrl),
          facebookUrl: opt(c.facebookUrl),
          instagramUrl: opt(c.instagramUrl),
          tiktokUrl: opt(c.tiktokUrl),
          youtubeUrl: opt(c.youtubeUrl),
          hours: opt(c.hours.th),
          address: opt(c.address.th),
        },
        hero: {
          title: opt(v.hero.title.th),
          subtitle: opt(v.hero.subtitle.th),
          background: v.hero.background,
        },
        footerNote: opt(v.footerNote.th),
        analyticsId: ga || null,
      },
      ...s.as,
    })
    await s.payload.updateGlobal({
      slug: 'site-settings',
      locale: 'en',
      depth: 0,
      data: {
        siteName: v.siteName.en.trim() || both(v.siteName) || 'Dive Potato Scuba Diving',
        contact: { hours: opt(c.hours.en), address: opt(c.address.en) },
        hero: { title: opt(v.hero.title.en), subtitle: opt(v.hero.subtitle.en) },
        footerNote: opt(v.footerNote.en),
      },
      ...s.as,
    })
    return done(L('บันทึกข้อมูลร้านแล้ว', 'Shop info saved'))
  } catch (err) {
    return { ok: false, message: errorMessage(err, L) }
  }
}
