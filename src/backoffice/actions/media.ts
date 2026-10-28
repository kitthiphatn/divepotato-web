'use server'

// Photo upload for the backoffice media picker. The file goes through the Local API as the
// signed-in user, so the Media collection's own config (storage folder, MEDIA_DIR, sharp) applies.
import type { MediaItem } from '../data'
import { mediaUrl } from '../data'
import { actionUser, errorMessage, isSession, type ActionResult } from '../server'

export type UploadResult = ActionResult & { item?: MediaItem }

// Keep in step with `experimental.serverActions.bodySizeLimit` in next.config.ts
const MAX_BYTES = 10 * 1024 * 1024
const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']

export async function uploadMediaAction(form: FormData): Promise<UploadResult> {
  const s = await actionUser(['admin', 'editor'])
  if (!isSession(s)) return s
  const { L } = s
  const file = form.get('file')
  const altTh = String(form.get('altTh') ?? '').trim()
  const altEn = String(form.get('altEn') ?? '').trim()
  if (!(file instanceof File) || file.size === 0)
    return { ok: false, message: L('เลือกไฟล์รูปก่อน', 'Choose a photo first') }
  if (!TYPES.includes(file.type))
    return {
      ok: false,
      message: L('รองรับเฉพาะ JPG, PNG, WebP, GIF, AVIF', 'Use a JPG, PNG, WebP, GIF or AVIF file'),
    }
  if (file.size > MAX_BYTES)
    return { ok: false, message: L('ไฟล์ใหญ่เกิน 10 MB', 'The file is larger than 10 MB') }
  if (!altTh && !altEn) return { ok: false, message: L('ใส่คำอธิบายรูป', 'Enter the alt text') }
  if (altTh.length > 200 || altEn.length > 200)
    return { ok: false, message: L('คำอธิบายรูปยาวเกินไป', 'The alt text is too long') }

  try {
    const doc = await s.payload.create({
      collection: 'media',
      locale: 'th',
      data: { alt: altTh || altEn },
      file: {
        data: Buffer.from(await file.arrayBuffer()),
        mimetype: file.type,
        name: file.name || 'photo',
        size: file.size,
      },
      ...s.as,
    })
    await s.payload.update({
      collection: 'media',
      id: doc.id,
      locale: 'en',
      data: { alt: altEn || altTh },
      ...s.as,
    })
    return {
      ok: true,
      id: doc.id,
      message: L('อัปโหลดรูปแล้ว', 'Photo uploaded'),
      item: {
        id: doc.id,
        url: mediaUrl(doc) ?? '',
        alt: s.lang === 'en' ? altEn || altTh : altTh || altEn,
        filename: doc.filename ?? '',
      },
    }
  } catch (err) {
    return { ok: false, message: errorMessage(err, L) }
  }
}

// Alt text in Thai and English for one photo (Website section: admin and editor)
export async function updateMediaAltAction(
  id: number,
  altTh: string,
  altEn: string,
): Promise<ActionResult> {
  const s = await actionUser(['admin', 'editor'])
  if (!isSession(s)) return s
  const { L } = s
  const th = altTh.trim()
  const en = altEn.trim()
  if (!th && !en) return { ok: false, message: L('ใส่คำอธิบายรูป', 'Enter the alt text') }
  if (th.length > 200 || en.length > 200)
    return { ok: false, message: L('คำอธิบายรูปยาวเกินไป', 'The alt text is too long') }
  try {
    await s.payload.update({
      collection: 'media',
      id,
      locale: 'th',
      data: { alt: th || en },
      ...s.as,
    })
    await s.payload.update({
      collection: 'media',
      id,
      locale: 'en',
      data: { alt: en || th },
      ...s.as,
    })
    return { ok: true, id, message: L('บันทึกคำอธิบายรูปแล้ว', 'Alt text saved') }
  } catch (err) {
    return { ok: false, message: errorMessage(err, L) }
  }
}

export type MediaUse = { where: string; href: string | null }
export type UsageResult = ActionResult & { uses?: MediaUse[] }

// Where a photo is still used: fields that point at Media in collections and globals. Photos
// placed inside rich text bodies (articles, trip descriptions, About) are not checked.
export async function mediaUsageAction(id: number): Promise<UsageResult> {
  const s = await actionUser(['admin'])
  if (!isSession(s)) return s
  const { L } = s
  const uses: MediaUse[] = []
  const BO = '/backoffice'
  const opts = { depth: 0, limit: 20, pagination: false as const, locale: s.lang, ...s.as }
  try {
    const [trips, courses, posts, products, sites, payments] = await Promise.all([
      s.payload.find({
        collection: 'trips',
        draft: true,
        where: { or: [{ gallery: { in: [id] } }, { 'seo.image': { equals: id } }] },
        select: { title: true },
        ...opts,
      }),
      s.payload.find({
        collection: 'courses',
        draft: true,
        where: { or: [{ gallery: { in: [id] } }, { 'seo.image': { equals: id } }] },
        select: { title: true },
        ...opts,
      }),
      s.payload.find({
        collection: 'posts',
        draft: true,
        where: { or: [{ cover: { equals: id } }, { 'seo.image': { equals: id } }] },
        select: { title: true },
        ...opts,
      }),
      s.payload.find({
        collection: 'products',
        draft: true,
        where: { images: { in: [id] } },
        select: { title: true },
        ...opts,
      }),
      s.payload.find({
        collection: 'dive-sites',
        where: { image: { equals: id } },
        select: { name: true },
        ...opts,
      }),
      s.payload.find({
        collection: 'payments',
        where: { slip: { equals: id } },
        select: { booking: true, ref: true },
        ...opts,
      }),
    ])
    for (const d of trips.docs)
      uses.push({ where: `${L('ทริป', 'Trip')}: ${d.title}`, href: `${BO}/trips/trip/${d.id}` })
    for (const d of courses.docs)
      uses.push({
        where: `${L('คอร์ส', 'Course')}: ${d.title}`,
        href: `${BO}/trips/course/${d.id}`,
      })
    for (const d of posts.docs)
      uses.push({
        where: `${L('บทความ', 'Article')}: ${d.title}`,
        href: `${BO}/website/articles/${d.id}`,
      })
    for (const d of products.docs)
      uses.push({ where: `${L('สินค้า', 'Product')}: ${d.title}`, href: `${BO}/shop/${d.id}` })
    for (const d of sites.docs)
      uses.push({ where: `${L('จุดดำน้ำ', 'Dive site')}: ${d.name}`, href: `${BO}/trips/sites` })
    for (const d of payments.docs)
      uses.push({
        where: `${L('สลิปการชำระเงิน', 'Payment slip')} #${d.id}`,
        href: `${BO}/bookings?open=${typeof d.booking === 'object' ? d.booking?.id : d.booking}`,
      })

    // Globals: read both languages because the popup images are per language
    const gl = (locale: 'th' | 'en') => ({
      depth: 0,
      locale,
      fallbackLocale: false as const,
      ...s.as,
    })
    const [site, home, about, popTh, popEn] = await Promise.all([
      s.payload.findGlobal({ slug: 'site-settings', ...gl('th') }),
      s.payload.findGlobal({ slug: 'home-sections', ...gl('th') }),
      s.payload.findGlobal({ slug: 'about-page', ...gl('th') }),
      s.payload.findGlobal({ slug: 'popup', ...gl('th') }),
      s.payload.findGlobal({ slug: 'popup', ...gl('en') }),
    ])
    const is = (v: unknown) => (v && typeof v === 'object' ? (v as { id: number }).id : v) === id
    const web = (tab: string) => `${BO}/website?tab=${tab}`
    if (is(site.logo) || is(site.favicon) || is(site.hero?.background))
      uses.push({
        where: L('ข้อมูลร้าน (โลโก้/รูป)', 'Shop info (logo/images)'),
        href: web('site'),
      })
    if ((home.heroSlides ?? []).some((r) => is(r.image)))
      uses.push({ where: L('สไลด์หน้าแรก', 'Home slides'), href: web('slides') })
    if (is(about.image) || is(about.seo?.image))
      uses.push({ where: L('หน้าเกี่ยวกับเรา', 'About page'), href: web('about') })
    if (
      [...(popTh.slides ?? []), ...(popEn.slides ?? [])].some(
        (r) => is(r.image) || is(r.mobileImage),
      )
    )
      uses.push({ where: L('ป๊อปอัป', 'Popup'), href: web('popup') })
    return { ok: true, message: '', uses }
  } catch (err) {
    return { ok: false, message: errorMessage(err, L) }
  }
}

// Deleting a photo is for admins only (the Media collection itself also allows editors)
export async function deleteMediaAction(id: number): Promise<ActionResult> {
  const s = await actionUser(['admin'])
  if (!isSession(s)) return s
  try {
    await s.payload.delete({ collection: 'media', id, ...s.as })
    return { ok: true, id, message: s.L('ลบรูปแล้ว', 'Photo deleted') }
  } catch (err) {
    return { ok: false, message: errorMessage(err, s.L) }
  }
}
