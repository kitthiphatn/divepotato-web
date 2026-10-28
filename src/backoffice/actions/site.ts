'use server'

// Website globals edited in the backoffice Website section: shop info (site-settings), the home
// page sections, the About page, the popup and the cookie banner. Thai is saved first, then
// English; array rows keep their ids so both languages land on the same rows.
import { revalidatePath } from 'next/cache'

import { blocksToLexical, type Block } from '../blocks'
import { BO } from '../nav'
import { SERVICE_ICON_KEYS, type ServiceIcon } from '../website'
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

// ---------- home page sections (everything except the hero slides) ----------

export type HomeSectionsInput = {
  services: { id: string | null; icon: ServiceIcon; title: Pair; text: Pair }[]
  showTrips: boolean
  showCourses: boolean
  showNews: boolean
  showFaq: boolean
}

export async function saveHomeSectionsAction(v: HomeSectionsInput): Promise<ActionResult> {
  const s = await actionUser([...CONTENT])
  if (!isSession(s)) return s
  const { L } = s
  if (v.services.length > 6)
    return { ok: false, message: L('ใส่จุดเด่นได้สูงสุด 6 ข้อ', 'Up to 6 highlights') }
  if (v.services.some((x) => !both(x.title)))
    return { ok: false, message: L('ใส่หัวข้อให้ทุกจุดเด่น', 'Every highlight needs a title') }
  const icon = (i: string) =>
    (SERVICE_ICON_KEYS as readonly string[]).includes(i) ? (i as ServiceIcon) : 'mask'
  try {
    // Only the fields sent are changed; the hero slides stay as they are
    const th = await s.payload.updateGlobal({
      slug: 'home-sections',
      locale: 'th',
      depth: 0,
      data: {
        services: v.services.map((x) => ({
          ...(x.id ? { id: x.id } : {}),
          icon: icon(x.icon),
          title: both(x.title),
          text: opt(x.text.th),
        })),
        showTrips: v.showTrips,
        showCourses: v.showCourses,
        showNews: v.showNews,
        showFaq: v.showFaq,
      },
      ...s.as,
    })
    await s.payload.updateGlobal({
      slug: 'home-sections',
      locale: 'en',
      depth: 0,
      data: {
        services: (th.services ?? []).map((row, i) => ({
          id: row.id,
          icon: row.icon,
          title: v.services[i]?.title.en.trim() || row.title,
          text: opt(v.services[i]?.text.en),
        })),
      },
      ...s.as,
    })
    return done(L('บันทึกหน้าแรกแล้ว', 'Home page saved'))
  } catch (err) {
    return { ok: false, message: errorMessage(err, L) }
  }
}

// ---------- About page ----------

export type AboutInput = {
  title: Pair
  intro: Pair
  image: number | null
  stats: { id: string | null; value: string; label: Pair }[]
  content: { th: Block[]; en: Block[] }
  contentDirty: { th: boolean; en: boolean }
  seoTitle: Pair
  seoDescription: Pair
  seoImage: number | null
}

export async function saveAboutAction(v: AboutInput): Promise<ActionResult> {
  const s = await actionUser([...CONTENT])
  if (!isSession(s)) return s
  const { L } = s
  if (v.stats.length > 6)
    return { ok: false, message: L('ใส่ตัวเลขเด่นได้สูงสุด 6 ข้อ', 'Up to 6 key figures') }
  if (v.stats.some((x) => !x.value.trim() || !both(x.label)))
    return {
      ok: false,
      message: L('ตัวเลขเด่นต้องมีทั้งตัวเลขและคำอธิบาย', 'Each key figure needs a value and a label'),
    }
  for (const l of ['th', 'en'] as const) {
    if (v.seoTitle[l].length > 70)
      return { ok: false, message: L('หัวข้อ SEO ยาวเกิน 70 ตัวอักษร', 'SEO title is over 70 characters') }
    if (v.seoDescription[l].length > 170)
      return {
        ok: false,
        message: L('คำอธิบาย SEO ยาวเกิน 170 ตัวอักษร', 'SEO description is over 170 characters'),
      }
  }
  // The body is only rewritten for a language whose blocks were edited
  const content = (l: 'th' | 'en') =>
    v.contentDirty[l] ? { content: blocksToLexical(v.content[l]) as never } : {}
  try {
    const th = await s.payload.updateGlobal({
      slug: 'about-page',
      locale: 'th',
      depth: 0,
      data: {
        title: opt(v.title.th),
        intro: opt(v.intro.th),
        image: v.image,
        stats: v.stats.map((x) => ({
          ...(x.id ? { id: x.id } : {}),
          value: x.value.trim(),
          label: both(x.label),
        })),
        ...content('th'),
        seo: {
          title: opt(v.seoTitle.th),
          description: opt(v.seoDescription.th),
          image: v.seoImage,
        },
      },
      ...s.as,
    })
    await s.payload.updateGlobal({
      slug: 'about-page',
      locale: 'en',
      depth: 0,
      data: {
        title: opt(v.title.en),
        intro: opt(v.intro.en),
        stats: (th.stats ?? []).map((row, i) => ({
          id: row.id,
          value: row.value,
          label: v.stats[i]?.label.en.trim() || row.label,
        })),
        ...content('en'),
        seo: { title: opt(v.seoTitle.en), description: opt(v.seoDescription.en) },
      },
      ...s.as,
    })
    return done(L('บันทึกหน้าเกี่ยวกับเราแล้ว', 'About page saved'))
  } catch (err) {
    return { ok: false, message: errorMessage(err, L) }
  }
}
