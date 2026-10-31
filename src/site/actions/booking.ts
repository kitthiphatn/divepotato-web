'use server'

import config from '@payload-config'
import { getPayload } from 'payload'

import { expireStaleHolds } from '@/hooks/bookings'
import { isLocale, type Locale } from '@/i18n/config'
import { dayStart, shopDay } from '@/lib/dates'
import { payPath } from '@/lib/payments/link'
import { clientIp, EMAIL, PHONE, rateLimiter, str } from '@/site/forms'
import { getDict } from '@/site/i18n'

export type BookingRequestState =
  | { ok: true; code: string | null; payUrl?: string }
  | { ok: false; error: string; field?: string }
  | null

// 5 requests per IP per 10 minutes
const limited = rateLimiter(5, 10 * 60_000)

const LINE_ID = /^@?[A-Za-z0-9._-]{2,40}$/

// Booking from a trip or course page. Records the customer and a booking on `hold`, which keeps
// its seats for the minutes set in Booking settings, and returns the pay link (/pay/<code>?t=…)
// where the customer pays the deposit by card, PromptPay QR or bank transfer. A hold nobody pays
// is marked expired the next time someone books, opens a pay page or staff open the bookings
// list, which gives the seats back.
export async function requestBooking(
  _prev: BookingRequestState,
  form: FormData,
): Promise<BookingRequestState> {
  const localeRaw = str(form.get('locale'), 4)
  const locale: Locale = isLocale(localeRaw) ? localeRaw : 'th'
  const e = getDict(locale).booking.errors

  // Honeypot: people never see this field; bots that fill it get a quiet "thank you"
  if (str(form.get('website'), 200)) return { ok: true, code: null }

  const name = str(form.get('name'), 100)
  const phone = str(form.get('phone'), 30)
  const email = str(form.get('email'), 120).toLowerCase()
  const lineId = str(form.get('lineId'), 50)
  const note = typeof form.get('note') === 'string' ? String(form.get('note')).trim().slice(0, 1000) : ''
  const pax = Number(form.get('pax'))
  const departureId = Number(form.get('departure'))

  if (name.length < 2) return { ok: false, error: e.name, field: 'name' }
  if (!PHONE.test(phone)) return { ok: false, error: e.phone, field: 'phone' }
  if (email && !EMAIL.test(email)) return { ok: false, error: e.email, field: 'email' }
  if (lineId && !LINE_ID.test(lineId)) return { ok: false, error: e.line, field: 'lineId' }
  if (!Number.isInteger(pax) || pax < 1 || pax > 20) return { ok: false, error: e.pax, field: 'pax' }
  if (!Number.isInteger(departureId) || departureId < 1)
    return { ok: false, error: e.departure, field: 'departure' }

  // Counted once the form is valid, so a typo doesn't use up someone's tries
  if (limited(await clientIp())) return { ok: false, error: e.rate }

  try {
    const payload = await getPayload({ config })
    // Give back seats from holds that ran out before counting what's left
    await expireStaleHolds(payload, departureId)
    const dep = await payload
      .findByID({ collection: 'departures', id: departureId, depth: 0, overrideAccess: true })
      .catch(() => null)
    const today = dayStart(shopDay(new Date()))
    if (!dep || dep.status !== 'open' || new Date(dep.startDate).toISOString() < today)
      return { ok: false, error: e.departure, field: 'departure' }
    const left = Math.max(0, (dep.capacity ?? 0) - (dep.seatsBooked ?? 0) - (dep.seatsHeld ?? 0))
    if (pax > left) return { ok: false, error: e.seats(left), field: 'pax' }

    const customer = await payload.create({
      collection: 'customers',
      data: {
        name,
        phone,
        email: email || undefined,
        lineId: lineId || undefined,
        notes: `${locale === 'th' ? 'จองผ่านเว็บไซต์' : 'Website booking'} (${locale.toUpperCase()})${note ? `\n${note}` : ''}`,
      },
      overrideAccess: true,
    })
    const booking = await payload.create({
      collection: 'bookings',
      data: {
        status: 'hold',
        source: 'website',
        departure: dep.id,
        customer: customer.id,
        // Names of the other guests and health forms come later, when the team confirms
        participants: Array.from({ length: pax }, (_, i) => ({
          name: i === 0 ? name : `${locale === 'th' ? 'ผู้เดินทาง' : 'Guest'} ${i + 1}`,
          healthOk: false,
        })),
        timeline: [
          {
            at: new Date().toISOString(),
            event: 'website booking (hold)',
            note: [lineId && `LINE ${lineId}`, note].filter(Boolean).join(' · ').slice(0, 500) || undefined,
          },
        ],
      },
      overrideAccess: true,
    })
    return {
      ok: true,
      code: booking.code ?? null,
      payUrl: booking.code && booking.payToken ? payPath(locale, booking.code, booking.payToken) : undefined,
    }
  } catch (err) {
    console.error('Booking request failed', err)
    return { ok: false, error: e.server }
  }
}
