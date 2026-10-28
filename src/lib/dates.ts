// The shop works on Thai time, whatever time zone the server runs in
export const SHOP_TZ = 'Asia/Bangkok'
const OFFSET = '+07:00'

// YYYY-MM-DD of an instant, in shop time
export function shopDay(value: string | Date): string {
  return new Date(value).toLocaleDateString('en-CA', { timeZone: SHOP_TZ })
}

// Start of a shop-time day (YYYY-MM-DD) as an ISO instant
export function dayStart(ymd: string): string {
  return new Date(`${ymd}T00:00:00${OFFSET}`).toISOString()
}

export function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function formatDate(value: string | Date, lang: string, opts?: Intl.DateTimeFormatOptions) {
  return new Date(value).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB', {
    timeZone: SHOP_TZ,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...opts,
  })
}

export const formatTHB = (n: number | null | undefined) =>
  `฿${Math.round(n ?? 0).toLocaleString('en-US')}`
