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
