import type { Locale } from '@/i18n/config'
import { departuresFor, seatsLeft, type Site } from '@/lib/content'
import type { Course, Departure, Trip } from '@/payload-types'

import type { BookingContact, BookingLabels, BookingOffering } from './components/BookingRequest'
import { cleanContact, dateRange, telHref, tripDepositPct } from './format'
import { getDict } from './i18n'

// Serializable props for the booking-request sheet of one trip or course
export function tripOffering(
  locale: Locale,
  trip: Trip,
  all: Departure[],
  shopPct: number,
): BookingOffering {
  const t = getDict(locale)
  return {
    kind: 'trip',
    title: trip.title,
    subtitle: t.trips.type[trip.type] ?? null,
    price: trip.price ?? 0,
    depositPct: tripDepositPct(trip, shopPct),
    departures: departuresFor(all, 'trip', trip.id).map((d) => depRow(locale, d)),
  }
}

export function courseOffering(
  locale: Locale,
  course: Course,
  all: Departure[],
  shopPct: number,
): BookingOffering {
  const t = getDict(locale)
  return {
    kind: 'course',
    title: course.title,
    subtitle: [course.padiCode, course.days ? t.common.days(course.days) : null]
      .filter(Boolean)
      .join(' · '),
    price: course.price ?? 0,
    depositPct: shopPct,
    departures: departuresFor(all, 'course', course.id).map((d) => depRow(locale, d)),
  }
}

function depRow(locale: Locale, d: Departure) {
  const left = seatsLeft(d)
  return {
    id: d.id,
    label: dateRange(locale, d.startDate, d.endDate),
    left,
    leftLabel: getDict(locale).booking.left(left),
  }
}

export function bookingLabels(locale: Locale, kind: 'trip' | 'course', pct: number): BookingLabels {
  const t = getDict(locale)
  const b = t.booking
  return {
    kicker: b.kicker[kind],
    close: b.close,
    dep: b.dep,
    people: b.people,
    minus: b.minus,
    plus: b.plus,
    name: b.name,
    phone: b.phone,
    email: b.email,
    line: b.line,
    note: b.note,
    notePh: b.notePh,
    price: b.price,
    total: b.total,
    deposit: b.deposit(pct),
    submit: b.submit,
    sending: b.sending,
    fine: b.fine,
    doneT: b.doneT,
    doneP: b.doneP,
    ref: b.ref,
    done: b.done,
    noOpen: b.noOpen,
    full: t.common.full,
    askLine: t.common.askLine,
    call: t.common.call,
  }
}

export function bookingContact(site: Site | null): BookingContact {
  const c = site?.settings.contact
  const phone = cleanContact(c?.phone)
  return {
    lineUrl: c?.lineUrl && /^https?:\/\//i.test(c.lineUrl) ? c.lineUrl : null,
    phoneHref: phone ? telHref(phone) : null,
  }
}
