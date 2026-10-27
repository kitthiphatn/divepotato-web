import config from '@payload-config'
import { getPayload } from 'payload'

import type { Locale } from '@/i18n/config'

import { dayStart, shopDay } from './dates'

// Public-page queries. Each returns empty results instead of throwing when the database isn't
// ready, so a page still renders.
async function db() {
  try {
    return await getPayload({ config })
  } catch {
    return null
  }
}

const published = { _status: { equals: 'published' } } as const

export async function getSite(locale: Locale) {
  const payload = await db()
  if (!payload) return null
  try {
    const [settings, announcement] = await Promise.all([
      payload.findGlobal({ slug: 'site-settings', locale, depth: 0 }),
      payload.findGlobal({ slug: 'announcement', locale }),
    ])
    return { settings, announcement }
  } catch {
    return null
  }
}

export async function getHome(locale: Locale) {
  const payload = await db()
  if (!payload) return null
  try {
    const [trips, courses] = await Promise.all([
      payload.find({
        collection: 'trips',
        locale,
        where: published,
        limit: 50,
        depth: 1,
        overrideAccess: false,
      }),
      payload.find({
        collection: 'courses',
        locale,
        where: published,
        limit: 50,
        depth: 1,
        overrideAccess: false,
      }),
    ])
    return { trips: trips.docs, courses: courses.docs }
  } catch {
    return null
  }
}

export async function getTrip(locale: Locale, slug: string) {
  const payload = await db()
  if (!payload) return null
  try {
    const res = await payload.find({
      collection: 'trips',
      locale,
      where: { and: [published, { slug: { equals: slug } }] },
      limit: 1,
      depth: 1,
      overrideAccess: false,
    })
    const trip = res.docs[0]
    if (!trip) return null
    // Upcoming departures, read on the server (departures aren't public through the API)
    const departures = await payload.find({
      collection: 'departures',
      where: {
        and: [
          { trip: { equals: trip.id } },
          { startDate: { greater_than_equal: dayStart(shopDay(new Date())) } },
          { status: { not_equals: 'closed' } },
        ],
      },
      sort: 'startDate',
      limit: 20,
      depth: 0,
    })
    return { trip, departures: departures.docs }
  } catch {
    return null
  }
}
