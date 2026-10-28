'use server'

// Home hero slides and the announcement bar. Thai is saved first, then English on the same
// slide rows (array row ids are shared between languages).
import { revalidatePath } from 'next/cache'

import { BO } from '../nav'
import { actionUser, errorMessage, isSession, type ActionResult } from '../server'

type Pair = { th: string; en: string }
export type SlideInput = {
  id?: string | null
  image: number | null
  title: Pair
  subtitle: Pair
  buttonLabel: Pair
  buttonLink: string
}
export type AnnouncementInput = {
  enabled: boolean
  tone: 'info' | 'warning'
  message: Pair
  link: string
}

const CONTENT = ['admin', 'editor'] as const

export async function saveHeroSlidesAction(slides: SlideInput[]): Promise<ActionResult> {
  const s = await actionUser([...CONTENT])
  if (!isSession(s)) return s
  const { L } = s
  if (slides.some((x) => !x.title.th.trim() && !x.title.en.trim()))
    return { ok: false, message: L('ใส่หัวข้อให้ทุกสไลด์', 'Every slide needs a title') }
  if (slides.length > 8) return { ok: false, message: L('ใส่ได้สูงสุด 8 สไลด์', 'Up to 8 slides') }
  try {
    const th = await s.payload.updateGlobal({
      slug: 'home-sections',
      locale: 'th',
      depth: 0,
      data: {
        heroSlides: slides.map((x) => ({
          ...(x.id ? { id: x.id } : {}),
          image: x.image,
          title: x.title.th.trim() || x.title.en.trim(),
          subtitle: x.subtitle.th.trim() || null,
          buttonLabel: x.buttonLabel.th.trim() || null,
          buttonLink: x.buttonLink.trim() || null,
        })),
      },
      ...s.as,
    })
    await s.payload.updateGlobal({
      slug: 'home-sections',
      locale: 'en',
      depth: 0,
      data: {
        heroSlides: (th.heroSlides ?? []).map((row, i) => ({
          id: row.id,
          image: slides[i]?.image ?? null,
          title: slides[i]?.title.en.trim() || row.title,
          subtitle: slides[i]?.subtitle.en.trim() || null,
          buttonLabel: slides[i]?.buttonLabel.en.trim() || null,
          buttonLink: row.buttonLink,
        })),
      },
      ...s.as,
    })
    revalidatePath(BO, 'layout')
    return { ok: true, message: L('บันทึกและเผยแพร่แล้ว', 'Saved and published') }
  } catch (err) {
    return { ok: false, message: errorMessage(err, L) }
  }
}

export async function saveAnnouncementAction(v: AnnouncementInput): Promise<ActionResult> {
  const s = await actionUser([...CONTENT])
  if (!isSession(s)) return s
  const { L } = s
  if (v.enabled && !v.message.th.trim() && !v.message.en.trim())
    return { ok: false, message: L('ใส่ข้อความประกาศ', 'Enter the announcement text') }
  try {
    await s.payload.updateGlobal({
      slug: 'announcement',
      locale: 'th',
      depth: 0,
      data: {
        enabled: v.enabled,
        tone: v.tone === 'warning' ? 'warning' : 'info',
        message: v.message.th.trim() || null,
        link: v.link.trim() || null,
      },
      ...s.as,
    })
    await s.payload.updateGlobal({
      slug: 'announcement',
      locale: 'en',
      depth: 0,
      data: { message: v.message.en.trim() || null },
      ...s.as,
    })
    revalidatePath(BO, 'layout')
    return {
      ok: true,
      message: v.enabled
        ? L('บันทึกแล้ว · แถบประกาศแสดงบนเว็บไซต์', 'Saved · the bar is live on the website')
        : L('บันทึกแล้ว · ซ่อนแถบประกาศ', 'Saved · the bar is hidden'),
    }
  } catch (err) {
    return { ok: false, message: errorMessage(err, L) }
  }
}
