'use server'

// Articles (Posts). Thai is saved first, then English, through the Local API as the user.
// The body is only rewritten for a language whose blocks were edited, so opening and saving an
// article never changes a body the simple editor didn't touch.
import { revalidatePath } from 'next/cache'

import { blocksToLexical, type Block } from '../blocks'
import { SLUG_RE, slugify, ymd } from '../format'
import type { PostCategory } from '../i18n'
import { BO } from '../nav'
import { actionUser, errorMessage, isSession, type ActionResult } from '../server'

type Pair = { th: string; en: string }
export type PostInput = {
  id: number | null
  published: boolean
  slug: string
  category: PostCategory
  // YYYY-MM-DD as picked, plus the stored timestamp so an unchanged date keeps its time
  date: string
  publishedAt: string | null
  cover: number | null
  title: Pair
  excerpt: Pair
  body: { th: Block[]; en: Block[] }
  bodyDirty: { th: boolean; en: boolean }
  seoTitle: Pair
  seoDescription: Pair
}

const LIMITS = { excerpt: 240, seoTitle: 70, seoDescription: 170 }

export async function savePostAction(v: PostInput): Promise<ActionResult> {
  const s = await actionUser(['admin', 'editor'])
  if (!isSession(s)) return s
  const { L } = s
  const titleTh = v.title.th.trim() || v.title.en.trim()
  if (!titleTh) return { ok: false, message: L('ใส่หัวข้อบทความ', 'Enter a title') }
  const slug = v.slug.trim() || slugify(v.title.en) || `post-${Date.now().toString(36)}`
  if (!SLUG_RE.test(slug))
    return {
      ok: false,
      message: L('slug ใช้ได้เฉพาะ a-z, 0-9 และ -', 'The slug may use a-z, 0-9 and - only'),
    }
  for (const loc of ['th', 'en'] as const) {
    if (v.excerpt[loc].length > LIMITS.excerpt)
      return {
        ok: false,
        message: L('คำโปรยยาวเกิน 240 ตัวอักษร', 'Summary is over 240 characters'),
      }
    if (v.seoTitle[loc].length > LIMITS.seoTitle)
      return {
        ok: false,
        message: L('หัวข้อ SEO ยาวเกิน 70 ตัวอักษร', 'SEO title is over 70 characters'),
      }
    if (v.seoDescription[loc].length > LIMITS.seoDescription)
      return {
        ok: false,
        message: L('คำอธิบาย SEO ยาวเกิน 170 ตัวอักษร', 'SEO description is over 170 characters'),
      }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date))
    return { ok: false, message: L('เลือกวันที่เผยแพร่', 'Pick a publish date') }
  const publishedAt =
    v.publishedAt && ymd(v.publishedAt) === v.date
      ? v.publishedAt
      : new Date(`${v.date}T09:00:00+07:00`).toISOString()
  const status = v.published ? ('published' as const) : ('draft' as const)
  const body = (loc: 'th' | 'en') =>
    v.bodyDirty[loc] ? { content: blocksToLexical(v.body[loc]) as never } : {}

  try {
    const th = {
      _status: status,
      slug,
      title: titleTh,
      category: v.category,
      publishedAt,
      cover: v.cover,
      excerpt: v.excerpt.th.trim() || null,
      ...body('th'),
      seo: {
        title: v.seoTitle.th.trim() || null,
        description: v.seoDescription.th.trim() || null,
      },
    }
    const doc = v.id
      ? await s.payload.update({ collection: 'posts', id: v.id, locale: 'th', data: th, ...s.as })
      : await s.payload.create({ collection: 'posts', locale: 'th', data: th, ...s.as })
    const id = doc.id
    await s.payload.update({
      collection: 'posts',
      id,
      locale: 'en',
      data: {
        _status: status,
        title: v.title.en.trim() || titleTh,
        excerpt: v.excerpt.en.trim() || null,
        ...body('en'),
        seo: {
          title: v.seoTitle.en.trim() || null,
          description: v.seoDescription.en.trim() || null,
        },
      },
      ...s.as,
    })
    revalidatePath(BO, 'layout')
    return {
      ok: true,
      id,
      redirect: `${BO}/website/articles/${id}`,
      message: v.published
        ? L('บันทึกและเผยแพร่บทความแล้ว', 'Article saved and published')
        : L('บันทึกฉบับร่างแล้ว · ยังไม่แสดงบนเว็บไซต์', 'Draft saved · not on the website yet'),
    }
  } catch (err) {
    return { ok: false, message: errorMessage(err, L) }
  }
}
