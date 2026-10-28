// Date and money formatting for the backoffice, matching the approved prototype.
// Every date is shown in shop time (Asia/Bangkok); Thai dates use the Buddhist year.
import type { Lang } from './i18n'

export const SHOP_TZ = 'Asia/Bangkok'

const MTH = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
]
const MTHF = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
]
const MEN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MENF = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
export const DOW_TH = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
export const DOW_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DOWF_TH = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
const DOWF_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// YYYY-MM-DD of an instant in shop time
export function ymd(value: string | Date | null | undefined): string {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-CA', { timeZone: SHOP_TZ })
}

export const todayYmd = () => ymd(new Date())
export const nowMs = () => Date.now()

// Hour of the day (0-23) in shop time
export function shopHour(value: Date = new Date()) {
  return Number(
    value.toLocaleString('en-GB', { timeZone: SHOP_TZ, hour: '2-digit', hour12: false }),
  )
}

// HH:MM in shop time
export function shopTime(value: string | Date) {
  return new Date(value).toLocaleTimeString('en-GB', {
    timeZone: SHOP_TZ,
    hour: '2-digit',
    minute: '2-digit',
  })
}

const parts = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return { y, m: m - 1, d }
}
const dow = (s: string) => new Date(`${s}T12:00:00Z`).getUTCDay()

export function addDays(s: string, n: number) {
  const d = new Date(`${s}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export const diffDays = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 864e5)

// "14 พ.ย." / "14 Nov"
export function fd(s: string, lang: Lang) {
  if (!s) return ''
  const { m, d } = parts(s)
  return lang === 'en' ? `${d} ${MEN[m]}` : `${d} ${MTH[m]}`
}

// "14 พ.ย. 2569" / "14 Nov 2026"
export function fdy(s: string, lang: Lang) {
  if (!s) return ''
  const { y, m, d } = parts(s)
  return lang === 'en' ? `${d} ${MEN[m]} ${y}` : `${d} ${MTH[m]} ${y + 543}`
}

// "14–17 พ.ย." or "28 พ.ย. – 2 ธ.ค."
export function frange(a: string, b: string | null | undefined, lang: Lang) {
  if (!b || a === b) return fd(a, lang)
  return parts(a).m === parts(b).m
    ? `${parts(a).d}–${fd(b, lang)}`
    : `${fd(a, lang)} – ${fd(b, lang)}`
}

export function longDate(s: string, lang: Lang) {
  const { y, m, d } = parts(s)
  const w = dow(s)
  return lang === 'en'
    ? `${DOWF_EN[w]}, ${d} ${MENF[m]} ${y}`
    : `วัน${DOWF_TH[w]}ที่ ${d} ${MTHF[m]} ${y + 543}`
}

export function monthLabel(month: string, lang: Lang) {
  const [y, m] = month.split('-').map(Number)
  return lang === 'en' ? `${MENF[m - 1]} ${y}` : `${MTHF[m - 1]} ${y + 543}`
}

export const monthShort = (m: number, lang: Lang) => (lang === 'en' ? MEN[m] : MTH[m])
export const monthFull = (m: number, lang: Lang) => (lang === 'en' ? MENF[m] : MTHF[m])

export const money = (n: number | null | undefined) =>
  `฿${Math.round(n ?? 0).toLocaleString('en-US')}`

// Two-letter avatar initials; Thai names drop vowel and tone marks
export function initials(name: string | null | undefined) {
  const n = (name ?? '').trim()
  if (!n) return '?'
  const p = n.split(/\s+/)
  if (/[ก-๙]/.test(n)) {
    const strip = (x: string) => x.replace(/[ัิ-ฺ็-๎]/g, '')
    return strip(p[0]).slice(0, 1) + (p[1] ? strip(p[1]).slice(0, 1) : '')
  }
  return (p[0][0] + (p[1] ? p[1][0] : '')).toUpperCase()
}
