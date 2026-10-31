import config from '@payload-config'
import { getPayload, type Payload, type Where } from 'payload'
import { cache } from 'react'

import type { Locale } from '@/i18n/config'
import type {
  Course,
  Departure,
  Faq,
  Media,
  Post,
  Product,
  ProductVariant,
  Trip,
} from '@/payload-types'

import { dayStart, shopDay } from './dates'

// Public-page queries. Each returns empty results instead of throwing when the database isn't
// ready, so a page still renders. Everything runs on the server through the Local API;
// collections visitors may only see when published are read with `overrideAccess: false`.
// `cache` shares one result between generateMetadata and the page in the same request.
const db = cache(async (): Promise<Payload | null> => {
  try {
    return await getPayload({ config })
  } catch {
    return null
  }
})

async function safe<T>(fallback: T, fn: (payload: Payload) => Promise<T>): Promise<T> {
  const payload = await db()
  if (!payload) return fallback
  try {
    return await fn(payload)
  } catch (err) {
    payload.logger.error({ err }, 'Public site query failed')
    return fallback
  }
}

const published: Where = { _status: { equals: 'published' } }
const publicRead = { overrideAccess: false } as const

// Posts with a future publish date stay hidden until then
const livePosts = (): Where => ({
  and: [published, { publishedAt: { less_than_equal: new Date().toISOString() } }],
})

export const mediaOf = (m: unknown): Media | null =>
  m && typeof m === 'object' && 'url' in m && (m as Media).url ? (m as Media) : null

export const firstImage = (list: unknown): Media | null =>
  Array.isArray(list) ? (list.map(mediaOf).find(Boolean) ?? null) : null

// ---------- site-wide globals ----------

export const getSite = cache(async (locale: Locale) =>
  safe(null, async (payload) => {
    const [settings, announcement, popup, cookie, booking] = await Promise.all([
      payload.findGlobal({ slug: 'site-settings', locale, depth: 1 }),
      payload.findGlobal({ slug: 'announcement', locale, depth: 0 }),
      payload.findGlobal({ slug: 'popup', locale, depth: 1 }),
      payload.findGlobal({ slug: 'cookie-consent', locale, depth: 0 }),
      payload.findGlobal({ slug: 'booking-settings', locale, depth: 0 }),
    ])
    return {
      settings,
      announcement,
      popup,
      cookie,
      depositPct: booking.depositPct ?? 30,
      cancellationPolicy: booking.cancellationPolicy ?? null,
    }
  }),
)

export type Site = NonNullable<Awaited<ReturnType<typeof getSite>>>

export const getHomeSections = cache(async (locale: Locale) =>
  safe(null, (payload) => payload.findGlobal({ slug: 'home-sections', locale, depth: 1 })),
)

export const getAbout = cache(async (locale: Locale) =>
  safe(null, (payload) => payload.findGlobal({ slug: 'about-page', locale, depth: 1 })),
)

// ---------- trips, courses and their departures ----------

export const listTrips = cache(async (locale: Locale) =>
  safe([] as Trip[], async (payload) => {
    const res = await payload.find({
      collection: 'trips',
      locale,
      where: published,
      sort: 'price',
      limit: 200,
      depth: 1,
      ...publicRead,
    })
    return res.docs
  }),
)

export const listCourses = cache(async (locale: Locale) =>
  safe([] as Course[], async (payload) => {
    const res = await payload.find({
      collection: 'courses',
      locale,
      where: published,
      sort: 'price',
      limit: 200,
      depth: 1,
      ...publicRead,
    })
    return res.docs
  }),
)

export const getTrip = cache(async (locale: Locale, slug: string) =>
  safe(null, async (payload) => {
    const res = await payload.find({
      collection: 'trips',
      locale,
      where: { and: [published, { slug: { equals: slug } }] },
      limit: 1,
      depth: 2,
      ...publicRead,
    })
    return res.docs[0] ?? null
  }),
)

export const getCourse = cache(async (locale: Locale, slug: string) =>
  safe(null, async (payload) => {
    const res = await payload.find({
      collection: 'courses',
      locale,
      where: { and: [published, { slug: { equals: slug } }] },
      limit: 1,
      depth: 1,
      ...publicRead,
    })
    return res.docs[0] ?? null
  }),
)

// Open departures from today on (shop time). Departures aren't public through the API, so they
// are read here on the server; only dates and seat counts reach the page.
export const listDepartures = cache(async (kind: 'trip' | 'course' | 'all' = 'all') =>
  safe([] as Departure[], async (payload) => {
    const where: Where[] = [
      { startDate: { greater_than_equal: dayStart(shopDay(new Date())) } },
      { status: { equals: 'open' } },
    ]
    if (kind !== 'all') where.push({ kind: { equals: kind } })
    const res = await payload.find({
      collection: 'departures',
      where: { and: where },
      sort: 'startDate',
      limit: 500,
      depth: 0,
    })
    return res.docs
  }),
)

export const seatsLeft = (d: Pick<Departure, 'capacity' | 'seatsBooked' | 'seatsHeld'>) =>
  Math.max(0, (d.capacity ?? 0) - (d.seatsBooked ?? 0) - (d.seatsHeld ?? 0))

const relIdOf = (v: unknown) =>
  v && typeof v === 'object' && 'id' in v ? (v as { id: number }).id : (v as number | null)

export function departuresFor(all: Departure[], kind: 'trip' | 'course', id: number) {
  return all.filter((d) => d.kind === kind && relIdOf(kind === 'course' ? d.course : d.trip) === id)
}

// ---------- articles ----------

export const POSTS_PER_PAGE = 9

export const listPosts = cache(
  async (locale: Locale, category: string | null, page = 1, limit = POSTS_PER_PAGE) =>
    safe(null, (payload) =>
      payload.find({
        collection: 'posts',
        locale,
        where: category
          ? { and: [livePosts(), { category: { equals: category } }] }
          : livePosts(),
        sort: '-publishedAt',
        limit,
        page,
        depth: 1,
        ...publicRead,
      }),
    ),
)

export const getPost = cache(async (locale: Locale, slug: string) =>
  safe(null, async (payload) => {
    const res = await payload.find({
      collection: 'posts',
      locale,
      where: { and: [livePosts(), { slug: { equals: slug } }] },
      limit: 1,
      depth: 2,
      ...publicRead,
    })
    return res.docs[0] ?? null
  }),
)

// Same category first, then the latest posts
export const relatedPosts = cache(async (locale: Locale, post: Post, count = 3) =>
  safe([] as Post[], async (payload) => {
    const base = { and: [livePosts(), { id: { not_equals: post.id } }] }
    const same = await payload.find({
      collection: 'posts',
      locale,
      where: { and: [...base.and, { category: { equals: post.category } }] },
      sort: '-publishedAt',
      limit: count,
      depth: 1,
      ...publicRead,
    })
    if (same.docs.length >= count) return same.docs
    const ids = [post.id, ...same.docs.map((p) => p.id)]
    const rest = await payload.find({
      collection: 'posts',
      locale,
      where: { and: [livePosts(), { id: { not_in: ids } }] },
      sort: '-publishedAt',
      limit: count - same.docs.length,
      depth: 1,
      ...publicRead,
    })
    return [...same.docs, ...rest.docs]
  }),
)

// ---------- FAQs ----------

export const listFaqs = cache(async (locale: Locale, homeOnly: boolean) =>
  safe([] as Faq[], async (payload) => {
    const res = await payload.find({
      collection: 'faqs',
      locale,
      where: homeOnly ? { showOnHome: { equals: true } } : undefined,
      sort: 'order',
      limit: 50,
      depth: 0,
    })
    return res.docs
  }),
)

// ---------- equipment ----------

export type ProductWithVariants = Product & { sizes: ProductVariant[] }

export const listProducts = cache(async (locale: Locale) =>
  safe([] as ProductWithVariants[], async (payload) => {
    const [products, variants] = await Promise.all([
      payload.find({ collection: 'products', locale, sort: 'title', limit: 500, depth: 1 }),
      payload.find({
        collection: 'product-variants',
        sort: 'price',
        pagination: false,
        depth: 0,
      }),
    ])
    return products.docs.map((p) => ({
      ...p,
      sizes: variants.docs.filter((v) => relIdOf(v.product) === p.id),
    }))
  }),
)

export const getProduct = cache(async (locale: Locale, slug: string) =>
  safe(null, async (payload) => {
    const res = await payload.find({
      collection: 'products',
      locale,
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 1,
    })
    const product = res.docs[0]
    if (!product) return null
    const variants = await payload.find({
      collection: 'product-variants',
      where: { product: { equals: product.id } },
      sort: 'price',
      pagination: false,
      depth: 0,
    })
    return { ...product, sizes: variants.docs } as ProductWithVariants
  }),
)

// ---------- sitemap ----------

export const sitemapEntries = async () =>
  safe({ trips: [], courses: [], posts: [], products: [] } as Record<
    'trips' | 'courses' | 'posts' | 'products',
    { slug: string; updatedAt: string }[]
  >, async (payload) => {
    const pick = { slug: true, updatedAt: true } as const
    const [trips, courses, posts, products] = await Promise.all([
      payload.find({ collection: 'trips', where: published, select: pick, pagination: false, ...publicRead }),
      payload.find({ collection: 'courses', where: published, select: pick, pagination: false, ...publicRead }),
      payload.find({ collection: 'posts', where: livePosts(), select: pick, pagination: false, ...publicRead }),
      payload.find({ collection: 'products', select: pick, pagination: false }),
    ])
    const rows = (docs: { slug?: string | null; updatedAt?: string | null }[]) =>
      docs.flatMap((d) => (d.slug ? [{ slug: d.slug, updatedAt: d.updatedAt ?? '' }] : []))
    return {
      trips: rows(trips.docs),
      courses: rows(courses.docs),
      posts: rows(posts.docs),
      products: rows(products.docs),
    }
  })
