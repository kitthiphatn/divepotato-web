// Fills the admin with Dive Potato sample data (ข้อมูลตัวอย่าง) so the owner can try it out:
// courses, trips, dive sites, ~12 departures, customers, bookings in every status with payments
// and timelines, posts, FAQs, shop products, rental items, site settings and demo users.
//
//   npm run seed
//
// Safe to run more than once: anything already there (by slug, email or SKU) is skipped, and the
// booking data is only added to a database that has no bookings yet.
// Photos: .webp files from SEED_PHOTOS_DIR (default /home/claude/designs/shared/photos) are added
// to Media when that folder exists; otherwise everything is created without images.
import fs from 'fs'
import path from 'path'
import { getPayload, type Payload } from 'payload'

import { addDays, shopDay } from '../src/lib/dates'
import config from '../src/payload.config'
import type { User } from '../src/payload-types'
import {
  BOOKINGS,
  COMPANIONS,
  COURSES,
  CUSTOMERS,
  DEPARTURES,
  DIVE_SITES,
  FAQS,
  PHOTOS,
  POSTS,
  PRODUCTS,
  RENTAL_ITEMS,
  SAMPLE_NOTE,
  STATUS_PATH,
  TRIPS,
} from './seed-data'

type L = { th: string; en: string }

const text = (t: string) => ({
  type: 'text',
  version: 1,
  text: t,
  detail: 0,
  format: 0,
  mode: 'normal',
  style: '',
})
const paragraph = (t: string) => ({
  type: 'paragraph',
  version: 1,
  direction: 'ltr' as const,
  format: '' as const,
  indent: 0,
  textFormat: 0,
  children: [text(t)],
})
const richText = (...lines: string[]) => ({
  root: {
    type: 'root',
    version: 1,
    direction: 'ltr' as const,
    format: '' as const,
    indent: 0,
    children: lines.map(paragraph),
  },
})
const lines = (items: L[], locale: 'th' | 'en') => items.map((i) => ({ text: i[locale] }))

const DEFAULT_PHOTOS_DIR = '/home/claude/designs/shared/photos'

// 09:00 shop time (Bangkok), `offset` days from today
const day = (offset: number) =>
  new Date(`${addDays(shopDay(new Date()), offset)}T09:00:00+07:00`).toISOString()

function log(line: string) {
  console.log(line)
}

async function findOne(
  payload: Payload,
  collection: 'trips' | 'courses' | 'dive-sites' | 'posts' | 'products',
  field: string,
  value: string,
) {
  const res = await payload.find({
    collection,
    where: { [field]: { equals: value } },
    limit: 1,
    depth: 0,
    draft: true,
  })
  return res.docs[0] as { id: number } | undefined
}

async function seedUsers(payload: Payload) {
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@divepotato.local'
  const password = process.env.SEED_ADMIN_PASSWORD || 'divepotato-demo'
  const accounts = [
    { email, password, name: 'Dive Potato Admin', role: 'admin' as const },
    {
      email: 'staff@divepotato.local',
      password: 'divepotato-demo',
      name: 'พนักงานหน้าร้าน (demo)',
      role: 'staff' as const,
    },
    {
      email: 'guide@divepotato.local',
      password: 'divepotato-demo',
      name: 'ไกด์ดำน้ำ (demo)',
      role: 'guide' as const,
    },
  ]
  let admin: User | undefined
  for (const a of accounts) {
    const existing = await payload.find({
      collection: 'users',
      where: { email: { equals: a.email } },
      limit: 1,
    })
    const user = existing.docs[0] ?? (await payload.create({ collection: 'users', data: a }))
    if (!existing.docs[0]) log(`User: ${a.email} (${a.role})`)
    if (a.role === 'admin') admin = user
  }
  return admin!
}

async function seedPhotos(payload: Payload) {
  const dir = process.env.SEED_PHOTOS_DIR || DEFAULT_PHOTOS_DIR
  const ids = new Map<string, number>()
  if (!fs.existsSync(dir)) {
    log(`Photos: ${dir} not found, skipping images`)
    return ids
  }
  for (const p of PHOTOS) {
    const file = path.join(dir, p.file)
    if (!fs.existsSync(file)) continue
    const existing = await payload.find({
      collection: 'media',
      where: { filename: { equals: p.file } },
      limit: 1,
    })
    let id = existing.docs[0]?.id
    if (!id) {
      const doc = await payload.create({
        collection: 'media',
        locale: 'th',
        data: { alt: p.alt.th },
        filePath: file,
      })
      await payload.update({
        collection: 'media',
        id: doc.id,
        locale: 'en',
        data: { alt: p.alt.en },
      })
      id = doc.id
    }
    ids.set(p.file, id)
  }
  log(`Photos: ${ids.size} in Media`)
  return ids
}

async function seedCatalog(payload: Payload, photos: Map<string, number>) {
  const photo = (f?: string) => (f ? (photos.get(f) ?? null) : null)
  const siteIds = new Map<string, number>()
  for (const s of DIVE_SITES) {
    const existing = await payload.find({
      collection: 'dive-sites',
      where: { name: { equals: s.name.th } },
      locale: 'th',
      limit: 1,
    })
    let id = existing.docs[0]?.id
    if (!id) {
      const doc = await payload.create({
        collection: 'dive-sites',
        locale: 'th',
        data: {
          name: s.name.th,
          region: s.region.th,
          description: s.description.th,
          image: photo(s.photo),
        },
      })
      await payload.update({
        collection: 'dive-sites',
        id: doc.id,
        locale: 'en',
        data: { name: s.name.en, region: s.region.en, description: s.description.en },
      })
      id = doc.id
    }
    siteIds.set(s.key, id)
  }
  log(`Dive sites: ${siteIds.size}`)

  const offerings = new Map<string, number>()
  for (const c of COURSES) {
    let doc = await findOne(payload, 'courses', 'slug', c.slug)
    if (!doc) {
      const created = await payload.create({
        collection: 'courses',
        locale: 'th',
        data: {
          _status: 'published',
          slug: c.slug,
          title: c.title.th,
          padiCode: c.padiCode,
          price: c.price,
          days: c.days,
          summary: c.summary.th,
          description: richText(c.summary.th, SAMPLE_NOTE.th),
          prerequisites: lines(c.prerequisites, 'th'),
          includes: lines(c.includes, 'th'),
          gallery: c.photo && photos.get(c.photo) ? [photos.get(c.photo)!] : [],
        },
      })
      await payload.update({
        collection: 'courses',
        id: created.id,
        locale: 'en',
        data: {
          _status: 'published',
          title: c.title.en,
          summary: c.summary.en,
          description: richText(c.summary.en, SAMPLE_NOTE.en),
          prerequisites: lines(c.prerequisites, 'en'),
          includes: lines(c.includes, 'en'),
        },
      })
      doc = created
    }
    offerings.set(c.slug, doc.id)
  }
  log(`Courses: ${COURSES.length}`)

  for (const t of TRIPS) {
    let doc = await findOne(payload, 'trips', 'slug', t.slug)
    if (!doc) {
      const created = await payload.create({
        collection: 'trips',
        locale: 'th',
        data: {
          _status: 'published',
          slug: t.slug,
          title: t.title.th,
          type: t.type,
          levelRequired: t.level,
          price: t.price,
          depositPct: t.depositPct ?? null,
          summary: t.summary.th,
          description: richText(t.summary.th, SAMPLE_NOTE.th),
          itinerary: t.itinerary.map((i) => ({ day: i.day, title: i.title.th, text: i.text.th })),
          includes: lines(t.includes, 'th'),
          excludes: lines(t.excludes, 'th'),
          diveSites: t.sites.map((k) => siteIds.get(k)!).filter(Boolean),
          gallery: t.photos.map((f) => photos.get(f)).filter((id): id is number => Boolean(id)),
        },
      })
      // The itinerary rows are shared between languages; keep their ids so the Thai text stays
      await payload.update({
        collection: 'trips',
        id: created.id,
        locale: 'en',
        data: {
          _status: 'published',
          title: t.title.en,
          summary: t.summary.en,
          description: richText(t.summary.en, SAMPLE_NOTE.en),
          itinerary: (created.itinerary ?? []).map((row, i) => ({
            id: row.id,
            day: row.day,
            title: t.itinerary[i].title.en,
            text: t.itinerary[i].text.en,
          })),
          includes: lines(t.includes, 'en'),
          excludes: lines(t.excludes, 'en'),
        },
      })
      doc = created
    }
    offerings.set(t.slug, doc.id)
  }
  log(`Trips: ${TRIPS.length}`)
  return offerings
}

async function seedShop(payload: Payload) {
  const rentals = new Map<string, number>()
  for (const r of RENTAL_ITEMS) {
    const existing = await payload.find({
      collection: 'rental-items',
      where: { name: { equals: r.name.th } },
      locale: 'th',
      limit: 1,
    })
    let id = existing.docs[0]?.id
    if (!id) {
      const doc = await payload.create({
        collection: 'rental-items',
        locale: 'th',
        data: { name: r.name.th, pricePerDay: r.pricePerDay, stock: r.stock },
      })
      await payload.update({
        collection: 'rental-items',
        id: doc.id,
        locale: 'en',
        data: { name: r.name.en },
      })
      id = doc.id
    }
    rentals.set(r.key, id)
  }
  log(`Rental items: ${rentals.size}`)

  for (const p of PRODUCTS) {
    let doc = await findOne(payload, 'products', 'slug', p.slug)
    if (!doc) {
      const created = await payload.create({
        collection: 'products',
        locale: 'th',
        data: {
          slug: p.slug,
          title: p.title.th,
          brand: p.brand,
          category: p.category,
          description: p.description.th,
        },
      })
      await payload.update({
        collection: 'products',
        id: created.id,
        locale: 'en',
        data: { title: p.title.en, description: p.description.en },
      })
      doc = created
    }
    for (const v of p.variants) {
      const exists = await payload.count({
        collection: 'product-variants',
        where: { sku: { equals: v.sku } },
      })
      if (!exists.totalDocs)
        await payload.create({ collection: 'product-variants', data: { ...v, product: doc.id } })
    }
  }
  log(`Products: ${PRODUCTS.length}`)
  return rentals
}

async function seedBookings(
  payload: Payload,
  admin: User,
  offerings: Map<string, number>,
  rentals: Map<string, number>,
) {
  if ((await payload.count({ collection: 'bookings' })).totalDocs > 0) {
    log('Bookings: already there, skipping departures, customers, bookings and payments')
    return
  }

  const departures = new Map<string, number>()
  for (const d of DEPARTURES) {
    const doc = await payload.create({
      collection: 'departures',
      user: admin,
      data: {
        kind: d.kind,
        trip: d.kind === 'trip' ? offerings.get(d.ref) : null,
        course: d.kind === 'course' ? offerings.get(d.ref) : null,
        startDate: day(d.offset),
        endDate: day(d.offset + d.length - 1),
        capacity: d.capacity,
        boat: d.boat,
        status: d.status ?? 'open',
        notes: SAMPLE_NOTE.th,
      },
    })
    departures.set(d.key, doc.id)
  }
  log(`Departures: ${departures.size}`)

  const customers: number[] = []
  for (const c of CUSTOMERS) {
    const doc = await payload.create({
      collection: 'customers',
      data: { ...c, notes: SAMPLE_NOTE.th },
    })
    customers.push(doc.id)
  }
  log(`Customers: ${customers.length}`)

  const sizes = ['S', 'M', 'L', 'XL', 'M', 'S'] as const
  const rentalKeys = [...rentals.keys()]
  let companion = 0
  let payments = 0
  for (const [i, b] of BOOKINGS.entries()) {
    const dep = DEPARTURES.find((d) => d.key === b.departure)!
    const level =
      dep.ref === 'padi-open-water'
        ? 'none'
        : dep.ref === 'padi-rescue-diver'
          ? 'aow'
          : i % 3 === 0
            ? 'aow'
            : 'ow'
    const participants = Array.from({ length: b.people }, (_, p) => ({
      name: p === 0 ? CUSTOMERS[b.customer].name : COMPANIONS[companion++ % COMPANIONS.length],
      certLevel: level as 'none' | 'ow' | 'aow',
      certNo: level === 'none' ? undefined : `PADI-${(2400000 + i * 10 + p).toString()}`,
      suitSize: sizes[(i + p) % sizes.length],
      shoeSize: String(38 + ((i + p) % 7)),
      rentals: (i + p) % 2 === 0 ? [rentals.get(rentalKeys[(i + p) % rentalKeys.length])!] : [],
      healthOk: !(i === 6 && p === 1),
      healthNotes:
        i === 6 && p === 1
          ? 'หอบหืดตอนเด็ก รอใบรับรองแพทย์ / childhood asthma, awaiting doctor sign-off'
          : undefined,
    }))

    const path = STATUS_PATH[b.status]
    let booking = await payload.create({
      collection: 'bookings',
      user: admin,
      data: {
        status: path[0],
        source: b.source,
        departure: departures.get(b.departure)!,
        customer: customers[b.customer],
        participants,
        // An expired hold started well before now
        holdExpiresAt: b.status === 'expired' ? day(-3) : undefined,
      },
    })

    for (const status of path.slice(1)) {
      if (status === 'pending_review') {
        // The deposit: a slip still waiting for review, or one that was later confirmed
        await payload.create({
          collection: 'payments',
          user: admin,
          data: {
            booking: booking.id,
            provider: b.depositVia ?? 'slip',
            kind: 'deposit',
            amount: booking.deposit ?? 0,
            status: b.status === 'pending_review' ? 'pending' : 'succeeded',
            ref: `DEP-${booking.code}`,
          },
        })
        payments++
      }
      if (status === 'paid') {
        await payload.create({
          collection: 'payments',
          user: admin,
          data: {
            booking: booking.id,
            provider: i % 2 ? 'cash' : 'transfer',
            kind: 'balance',
            amount: booking.balance ?? 0,
            status: 'succeeded',
            ref: `BAL-${booking.code}`,
          },
        })
        payments++
      }
      if (status === 'refunded') {
        await payload.create({
          collection: 'payments',
          user: admin,
          data: {
            booking: booking.id,
            provider: 'transfer',
            kind: 'refund',
            amount: booking.deposit ?? 0,
            status: 'succeeded',
            ref: `REF-${booking.code}`,
          },
        })
        payments++
      }
      booking = await payload.update({
        collection: 'bookings',
        id: booking.id,
        user: admin,
        data: { status },
      })
    }
    log(`Booking ${booking.code}: ${b.status}, ${b.people} pax, total ${booking.total}`)
  }
  log(`Payments: ${payments}`)
}

async function seedContent(payload: Payload, photos: Map<string, number>) {
  for (const p of POSTS) {
    if (await findOne(payload, 'posts', 'slug', p.slug)) continue
    const doc = await payload.create({
      collection: 'posts',
      locale: 'th',
      data: {
        _status: 'published',
        slug: p.slug,
        title: p.title.th,
        category: p.category,
        excerpt: p.excerpt.th,
        content: richText(...p.body.map((b) => b.th), SAMPLE_NOTE.th),
        cover: p.photo ? (photos.get(p.photo) ?? null) : null,
        publishedAt: new Date().toISOString(),
      },
    })
    await payload.update({
      collection: 'posts',
      id: doc.id,
      locale: 'en',
      data: {
        _status: 'published',
        title: p.title.en,
        excerpt: p.excerpt.en,
        content: richText(...p.body.map((b) => b.en), SAMPLE_NOTE.en),
      },
    })
  }
  log(`Posts: ${POSTS.length}`)

  if ((await payload.count({ collection: 'faqs' })).totalDocs === 0) {
    for (const f of FAQS) {
      const doc = await payload.create({
        collection: 'faqs',
        locale: 'th',
        data: {
          question: f.q.th,
          answer: f.a.th,
          category: f.category,
          order: f.order,
          showOnHome: true,
        },
      })
      await payload.update({
        collection: 'faqs',
        id: doc.id,
        locale: 'en',
        data: { question: f.q.en, answer: f.a.en },
      })
    }
  }
  log(`FAQs: ${FAQS.length}`)
}

async function seedGlobals(payload: Payload, photos: Map<string, number>) {
  const hero = photos.get('diver-green-reef.webp') ?? null
  await payload.updateGlobal({
    slug: 'site-settings',
    locale: 'th',
    data: {
      siteName: 'Dive Potato Scuba Diving',
      contact: {
        phone: '+66 80 000 0000 (placeholder)',
        lineId: '@divepotato (placeholder)',
        lineUrl: 'https://line.me/R/ti/p/@divepotato',
        email: 'hello@divepotato.local',
        hours: 'ทุกวัน 08:00-19:00',
        address: 'ที่อยู่ร้าน (ตัวอย่าง)',
      },
      hero: {
        title: 'ดำน้ำกับ Dive Potato',
        subtitle: 'ทริปดำน้ำและคอร์ส PADI ทั้งในไทยและต่างประเทศ',
        background: hero,
      },
      footerNote: `${SAMPLE_NOTE.th}`,
    },
  })
  await payload.updateGlobal({
    slug: 'site-settings',
    locale: 'en',
    data: {
      siteName: 'Dive Potato Scuba Diving',
      contact: { hours: 'Daily 08:00-19:00', address: 'Shop address (sample)' },
      hero: {
        title: 'Dive with Dive Potato',
        subtitle: 'PADI courses and dive trips in Thailand and beyond',
      },
      footerNote: SAMPLE_NOTE.en,
    },
  })

  await payload.updateGlobal({
    slug: 'announcement',
    locale: 'th',
    data: {
      enabled: true,
      tone: 'info',
      message: `${SAMPLE_NOTE.th}: ราคา คน และวันที่ในระบบเป็นข้อมูลสมมติ`,
    },
  })
  await payload.updateGlobal({
    slug: 'announcement',
    locale: 'en',
    data: { message: `${SAMPLE_NOTE.en}: prices, people and dates are made up` },
  })

  const home = await payload.updateGlobal({
    slug: 'home-sections',
    locale: 'th',
    data: {
      services: [
        {
          icon: 'certificate',
          title: 'คอร์ส PADI ครบทุกระดับ',
          text: 'ตั้งแต่ Open Water ถึง Divemaster',
        },
        { icon: 'boat', title: 'ทริปค้างเรือและไปเช้าเย็นกลับ', text: 'สิมิลัน เกาะเต่า หลีเป๊ะ' },
        { icon: 'globe', title: 'ทริปต่างประเทศ', text: 'ปาเลา กาลาปากอส และว่ายน้ำกับวาฬ' },
      ],
    },
  })
  await payload.updateGlobal({
    slug: 'home-sections',
    locale: 'en',
    data: {
      services: (home.services ?? []).map((s, i) => ({
        ...s,
        title: ['Every PADI level', 'Liveaboards and day trips', 'Overseas expeditions'][i],
        text: [
          'From Open Water to Divemaster',
          'Similan, Koh Tao, Koh Lipe',
          'Palau, Galapagos and whale swims',
        ][i],
      })),
    },
  })

  await payload.updateGlobal({
    slug: 'about-page',
    locale: 'th',
    data: {
      title: 'เกี่ยวกับ Dive Potato',
      intro: 'ร้านดำน้ำ PADI ที่ดูแลนักดำน้ำแบบกรุ๊ปเล็ก (ข้อความตัวอย่าง)',
      image: photos.get('manta-diver.webp') ?? null,
      content: richText('ข้อความตัวอย่าง แก้ไขได้ที่หลังบ้าน'),
    },
  })
  await payload.updateGlobal({
    slug: 'about-page',
    locale: 'en',
    data: {
      title: 'About Dive Potato',
      intro: 'A PADI dive shop that keeps groups small (sample text)',
      content: richText('Sample text; edit it in the admin.'),
    },
  })

  await payload.updateGlobal({
    slug: 'cookie-consent',
    locale: 'th',
    data: { message: 'เว็บไซต์นี้ใช้คุกกี้เพื่อให้ใช้งานได้ดีขึ้น' },
  })
  await payload.updateGlobal({
    slug: 'cookie-consent',
    locale: 'en',
    data: { message: 'This site uses cookies to work better.' },
  })

  await payload.updateGlobal({
    slug: 'booking-settings',
    locale: 'th',
    data: {
      depositPct: 30,
      holdMinutes: 15,
      promptPayId: '0000000000 (sample)',
      notifyEmail: 'bookings@divepotato.local',
      cancellationPolicy: richText(
        'ยกเลิกก่อนเดินทาง 30 วันขึ้นไป คืนมัดจำเต็มจำนวน',
        'ยกเลิก 15-29 วันก่อนเดินทาง คืนมัดจำ 50%',
        'ยกเลิกน้อยกว่า 15 วัน ไม่คืนมัดจำ',
      ),
    },
  })
  await payload.updateGlobal({
    slug: 'booking-settings',
    locale: 'en',
    data: {
      cancellationPolicy: richText(
        'Cancel 30+ days before departure: full deposit refund.',
        'Cancel 15-29 days before: 50% of the deposit refunded.',
        'Cancel less than 15 days before: no refund.',
      ),
    },
  })
  log('Globals: site settings, announcement, homepage, about, cookie banner, booking settings')
}

const payload = await getPayload({ config })
const admin = await seedUsers(payload)
const photos = await seedPhotos(payload)
const offerings = await seedCatalog(payload, photos)
const rentals = await seedShop(payload)
await seedGlobals(payload, photos)
await seedContent(payload, photos)
await seedBookings(payload, admin, offerings, rentals)
log('Done. Sign in at /admin with the demo accounts listed in README.md.')
process.exit(0)
