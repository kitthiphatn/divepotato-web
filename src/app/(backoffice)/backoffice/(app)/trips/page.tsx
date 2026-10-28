import type { Metadata } from 'next'
import Link from 'next/link'

import { bookingDefaults, mediaUrl } from '@/backoffice/data'
import { fd, money, todayYmd, ymd } from '@/backoffice/format'
import { CAT_LABEL, pair } from '@/backoffice/i18n'
import { Icon } from '@/backoffice/icons'
import { BO } from '@/backoffice/nav'
import { requireUser } from '@/backoffice/server'
import { Img } from '@/backoffice/ui/bits'
import type { DiveSite, Media } from '@/payload-types'

export const metadata: Metadata = { title: 'ทริปและคอร์ส · Trips & courses' }

const CATS = ['course', 'daytrip', 'liveaboard', 'overseas'] as const

type Card = {
  key: string
  href: string
  cat: string
  title: string
  place: string
  days: number
  price: number
  depositPct: number
  published: boolean
  photo: string | null
  next: string | null
}

export default async function TripsPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>
}) {
  const s = await requireUser(['admin', 'editor'])
  const { L, lang } = s
  const sp = await searchParams
  const cat = (CATS as readonly string[]).includes(sp.cat ?? '') ? sp.cat! : 'all'
  const today = todayYmd()
  const opts = { draft: true, pagination: false as const, depth: 1, locale: lang, ...s.as }
  const [trips, courses, defaults] = await Promise.all([
    s.payload.find({ collection: 'trips', sort: 'title', ...opts }),
    s.payload.find({ collection: 'courses', sort: 'price', ...opts }),
    bookingDefaults(s),
  ])
  // Next departure per trip/course: departures are readable by admins only among these roles
  const next = new Map<string, string>()
  if (s.role === 'admin') {
    const deps = await s.payload.find({
      collection: 'departures',
      where: { startDate: { greater_than_equal: `${today}T00:00:00+07:00` } },
      sort: 'startDate',
      pagination: false,
      depth: 0,
      ...s.as,
    })
    for (const d of deps.docs) {
      const key = d.kind === 'course' ? `course-${d.course}` : `trip-${d.trip}`
      if (!next.has(key)) next.set(key, ymd(d.startDate))
    }
  }

  const cards: Card[] = [
    ...courses.docs.map((c) => ({
      key: `course-${c.id}`,
      href: `${BO}/trips/course/${c.id}`,
      cat: 'course',
      title: c.title,
      place: c.padiCode ? `PADI ${c.padiCode}` : 'PADI',
      days: c.days ?? 1,
      price: c.price,
      depositPct: defaults.depositPct,
      published: c._status === 'published',
      photo: mediaUrl((c.gallery ?? [])[0] as Media),
      next: next.get(`course-${c.id}`) ?? null,
    })),
    ...trips.docs.map((t) => {
      const site = (t.diveSites ?? []).find((x) => typeof x === 'object') as DiveSite | undefined
      return {
        key: `trip-${t.id}`,
        href: `${BO}/trips/trip/${t.id}`,
        cat: t.type,
        title: t.title,
        place: site?.region ?? pair(lang, CAT_LABEL[t.type]),
        days: Math.max(1, t.itinerary?.length ?? 1),
        price: t.price,
        depositPct: t.depositPct ?? defaults.depositPct,
        published: t._status === 'published',
        photo: mediaUrl((t.gallery ?? [])[0] as Media),
        next: next.get(`trip-${t.id}`) ?? null,
      }
    }),
  ]
  const list = cards.filter((c) => cat === 'all' || c.cat === cat)

  return (
    <>
      <div className="ph">
        <div>
          <h1>{L('ทริปและคอร์ส', 'Trips & courses')}</h1>
          <p className="lede">
            {L(
              'สิ่งที่ลูกค้าเห็นและจองได้บนหน้าเว็บไซต์',
              'What customers see and can book on the website',
            )}
          </p>
        </div>
        <div className="acts">
          <Link className="btn o" href={`${BO}/trips/course/new`}>
            <Icon name="plus" />
            {L('เพิ่มคอร์ส', 'New course')}
          </Link>
          <Link className="btn y" href={`${BO}/trips/trip/new`}>
            <Icon name="plus" />
            {L('เพิ่มทริป', 'New trip')}
          </Link>
        </div>
      </div>
      <div className="chips">
        {(['all', ...CATS] as const).map((k) => (
          <Link
            key={k}
            href={k === 'all' ? `${BO}/trips` : `${BO}/trips?cat=${k}`}
            aria-pressed={cat === k}
            role="button"
          >
            {k === 'all' ? L('ทั้งหมด', 'All') : pair(lang, CAT_LABEL[k])}{' '}
            <sup className="num">
              {k === 'all' ? cards.length : cards.filter((c) => c.cat === k).length}
            </sup>
          </Link>
        ))}
      </div>
      <div className="tgrid">
        {list.map((t) => (
          <Link key={t.key} className="tcard" href={t.href}>
            <div className="im">
              <Img src={t.photo} />
              <span className="tagc">{pair(lang, CAT_LABEL[t.cat])}</span>
              {t.published ? (
                <span className="pill st-paid">{L('เผยแพร่', 'Live')}</span>
              ) : (
                <span className="pill st-hold" style={{ background: '#fff' }}>
                  {L('ฉบับร่าง', 'Draft')}
                </span>
              )}
            </div>
            <div className="bd">
              <span className="pl">
                {t.place} · {t.days} {L('วัน', t.days > 1 ? 'days' : 'day')}
              </span>
              <h3>{t.title}</h3>
              <div className="pr">
                <span>
                  <small>{L('เริ่มต้น', 'From')}</small>
                  <b className="num">{money(t.price)}</b>
                  <small>
                    {L('มัดจำ', 'Deposit')} {t.depositPct}%
                  </small>
                </span>
                {s.role === 'admin' && (
                  <span className="nx">
                    {t.next ? (
                      <>
                        {L('รอบถัดไป', 'Next')}
                        <br />
                        <b style={{ color: 'var(--ink)', fontWeight: 500 }}>{fd(t.next, lang)}</b>
                      </>
                    ) : (
                      L('ยังไม่มีรอบ', 'No dates yet')
                    )}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
        <Link
          className="tcard add"
          href={`${BO}/trips/${cat === 'course' ? 'course' : 'trip'}/new`}
        >
          <span className="ic">
            <Icon name="plus" />
          </span>
          {L('เพิ่มทริปหรือคอร์สใหม่', 'Add a trip or course')}
        </Link>
      </div>
    </>
  )
}
