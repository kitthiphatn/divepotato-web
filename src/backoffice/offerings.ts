import type { OfferingOption } from './ui/DepartureForm'
import type { Session } from './server'

// Trips and courses (drafts included) for the departure form
export async function offeringOptions(s: Session): Promise<OfferingOption[]> {
  const [trips, courses] = await Promise.all([
    s.payload.find({
      collection: 'trips',
      draft: true,
      pagination: false,
      depth: 0,
      locale: s.lang,
      sort: 'title',
      ...s.as,
    }),
    s.payload.find({
      collection: 'courses',
      draft: true,
      pagination: false,
      depth: 0,
      locale: s.lang,
      sort: 'title',
      ...s.as,
    }),
  ])
  return [
    ...trips.docs.map((t) => ({
      id: t.id,
      kind: 'trip' as const,
      name: t.title,
      days: Math.max(1, t.itinerary?.length ?? 1),
    })),
    ...courses.docs.map((c) => ({
      id: c.id,
      kind: 'course' as const,
      name: c.title,
      days: c.days ?? 1,
    })),
  ]
}
