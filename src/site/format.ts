import type { Locale } from '@/i18n/config'
import { SHOP_TZ, formatTHB, shopDay } from '@/lib/dates'
import type { Course, Departure, Trip } from '@/payload-types'

export const money = formatTHB

export const depositOf = (price: number | null | undefined, pct: number) =>
  Math.round(((price ?? 0) * pct) / 100)

// Deposit % used by the booking hooks: a trip's own value, otherwise the shop default
export const tripDepositPct = (trip: Pick<Trip, 'depositPct'>, shopPct: number) =>
  typeof trip.depositPct === 'number' ? trip.depositPct : shopPct

const dtf = (locale: Locale, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(locale === 'th' ? 'th-TH' : 'en-GB', { timeZone: SHOP_TZ, ...opts })

// "17–19 ต.ค. 2569" / "17–19 Oct 2026", spanning months when needed
export function dateRange(locale: Locale, start: string, end?: string | null) {
  const s = new Date(start)
  const e = end ? new Date(end) : s
  const full = dtf(locale, { day: 'numeric', month: 'short', year: 'numeric' })
  if (shopDay(s) === shopDay(e)) return full.format(s)
  const sameMonth = shopDay(s).slice(0, 7) === shopDay(e).slice(0, 7)
  const sameYear = shopDay(s).slice(0, 4) === shopDay(e).slice(0, 4)
  if (sameMonth) return `${dtf(locale, { day: 'numeric' }).format(s)}–${full.format(e)}`
  if (sameYear)
    return `${dtf(locale, { day: 'numeric', month: 'short' }).format(s)} – ${full.format(e)}`
  return `${full.format(s)} – ${full.format(e)}`
}

export const longDate = (locale: Locale, value: string) =>
  dtf(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value))

// "2026-11" of a departure, in shop time, and its label "พ.ย. 2569" / "Nov 2026"
export const monthKey = (value: string) => shopDay(value).slice(0, 7)
export const monthLabel = (locale: Locale, key: string) =>
  dtf(locale, { month: 'short', year: 'numeric' }).format(new Date(`${key}-15T12:00:00Z`))

export const departureDays = (d: Pick<Departure, 'startDate' | 'endDate'>) => {
  const s = Date.parse(`${shopDay(d.startDate)}T00:00:00Z`)
  const e = Date.parse(`${shopDay(d.endDate || d.startDate)}T00:00:00Z`)
  return Math.max(1, Math.round((e - s) / 864e5) + 1)
}

// Trip length from its itinerary (days), when the trip has one
export const tripDays = (trip: Pick<Trip, 'itinerary'>) =>
  (trip.itinerary ?? []).reduce((n, r) => Math.max(n, r.day ?? 0), 0) || null

// Courses have no category field, so the level filter is read from the PADI code
const BEGINNER = ['DSD', 'OWD', 'SD', 'BSD', 'BM', 'SR', 'SKIN', 'SNK']
const PRO = ['DM', 'AI', 'IDC', 'OWSI', 'MSDT', 'IDCS', 'CD']
export function courseLevel(course: Pick<Course, 'padiCode'>): 'beginner' | 'continuing' | 'pro' {
  const code = (course.padiCode ?? '').toUpperCase().trim()
  if (BEGINNER.includes(code)) return 'beginner'
  if (PRO.includes(code)) return 'pro'
  return 'continuing'
}

// Open Water is the course the site promotes in the header, menu and mobile bar
export const featuredCourse = (courses: Course[]) =>
  courses.find((c) => (c.padiCode ?? '').toUpperCase() === 'OWD') ?? courses[0] ?? null

// Links typed in the CMS: absolute site paths get the locale, others stay as they are
export function localHref(locale: Locale, link: string | null | undefined): string | null {
  const v = (link ?? '').trim()
  if (!v) return null
  if (/^(https?:|mailto:|tel:)/i.test(v)) return v
  if (v.startsWith('#')) return `/${locale}${v}`
  if (v.startsWith('/')) {
    if (/^\/(th|en)(\/|$|#|\?)/.test(v) || /^\/(api|backoffice|admin)(\/|$)/.test(v)) return v
    return `/${locale}${v === '/' ? '' : v}`
  }
  return null
}

export const isExternal = (href: string) => /^https?:/i.test(href)

// Words per minute differ: Thai has no spaces, so count characters instead
export function readingMinutes(text: string, locale: Locale) {
  const n = locale === 'th' ? text.replace(/\s+/g, '').length / 600 : text.split(/\s+/).length / 220
  return Math.max(1, Math.round(n))
}

export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`

// Strip the "(placeholder)"-style notes the seed adds to contact details for links
export const cleanContact = (v: string | null | undefined) =>
  (v ?? '').replace(/\s*\([^)]*\)\s*$/, '').trim()
