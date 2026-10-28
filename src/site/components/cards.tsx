import Image from 'next/image'
import Link from 'next/link'

import type { Locale } from '@/i18n/config'
import {
  departuresFor,
  firstImage,
  mediaOf,
  seatsLeft,
  type ProductWithVariants,
} from '@/lib/content'
import type { Course, Departure, Media, Post, Trip } from '@/payload-types'
import { bookingLabels, courseOffering, tripOffering } from '@/site/booking'
import {
  dateRange,
  depositOf,
  money,
  monthKey,
  readingMinutes,
  tripDays,
  tripDepositPct,
} from '@/site/format'
import { getDict } from '@/site/i18n'
import { GearIcon } from '@/site/icons'
import { plainText } from '@/site/RichText'

import { BookButton, type BookingContact } from './BookingRequest'

// What every card with a "จอง" button needs
export type BookCtx = {
  locale: Locale
  contact: BookingContact
  shopPct: number
  departures: Departure[]
}

export function Seats({ left, locale }: { left: number; locale: Locale }) {
  const t = getDict(locale).common
  if (left <= 0) return <span className="bdg">{t.full}</span>
  if (left <= 2) return <span className="bdg low">{t.onlyLeft(left)}</span>
  return <span className="bdg">{t.seatsLeft(left)}</span>
}

export function BookTrip({
  ctx,
  trip,
  className,
  departureId,
  label,
}: {
  ctx: BookCtx
  trip: Trip
  className?: string
  departureId?: number
  label?: string
}) {
  const offering = tripOffering(ctx.locale, trip, ctx.departures, ctx.shopPct)
  return (
    <BookButton
      offering={offering}
      labels={bookingLabels(ctx.locale, 'trip', offering.depositPct)}
      contact={ctx.contact}
      locale={ctx.locale}
      className={className}
      departureId={departureId}
    >
      {label ?? getDict(ctx.locale).common.book}
    </BookButton>
  )
}

export function BookCourse({
  ctx,
  course,
  className,
  departureId,
  label,
}: {
  ctx: BookCtx
  course: Course
  className?: string
  departureId?: number
  label?: string
}) {
  const offering = courseOffering(ctx.locale, course, ctx.departures, ctx.shopPct)
  return (
    <BookButton
      offering={offering}
      labels={bookingLabels(ctx.locale, 'course', offering.depositPct)}
      contact={ctx.contact}
      locale={ctx.locale}
      className={className}
      departureId={departureId}
    >
      {label ?? getDict(ctx.locale).common.book}
    </BookButton>
  )
}

function Price({ locale, price, pct }: { locale: Locale; price: number; pct: number }) {
  const t = getDict(locale).common
  return (
    <div className="pr">
      <span className="fr">{t.from}</span>
      <b className="num">{money(price)}</b>
      <span className="dp">
        {t.depositPct(pct)} · {money(depositOf(price, pct))}
      </span>
    </div>
  )
}

function courseFacts(locale: Locale, c: Course, next: Departure | undefined) {
  const t = getDict(locale)
  return (
    <div className="fx">
      {c.days ? <span>{t.common.days(c.days)}</span> : null}
      {c.padiCode ? <span>PADI {c.padiCode}</span> : null}
      <span>
        {next ? `${t.courses.nextClass} ${dateRange(locale, next.startDate, next.endDate)}` : t.courses.noClass}
      </span>
    </div>
  )
}

// Course tile of the courses grid (home and /courses)
export function CourseTile({ ctx, course, fallback }: { ctx: BookCtx; course: Course; fallback?: Media | null }) {
  const { locale } = ctx
  const t = getDict(locale)
  // A course without its own photo borrows a spare one so the grid never shows a blank tile
  const img = firstImage(course.gallery) ?? fallback ?? null
  const href = `/${locale}/courses/${course.slug}`
  const next = departuresFor(ctx.departures, 'course', course.id)[0]
  return (
    <article className="ct">
      <Link className="ph" href={href} tabIndex={-1} aria-hidden="true">
        {img && (
          <Image src={img.url!} alt="" fill sizes="(max-width: 700px) 100vw, 400px" style={{ objectFit: 'cover' }} />
        )}
      </Link>
      <div className="bd">
        <h3>
          <Link href={href}>{course.title}</Link>
        </h3>
        {course.summary && <p className="s">{course.summary}</p>}
        {courseFacts(locale, course, next)}
        <Price locale={locale} price={course.price} pct={ctx.shopPct} />
        <div className="act">
          <BookCourse ctx={ctx} course={course} />
          <Link className="more" href={href}>
            {t.common.more}
          </Link>
        </div>
      </div>
    </article>
  )
}

// The big photo tile for the featured course (Open Water)
export function FeaturedCourse({ ctx, course }: { ctx: BookCtx; course: Course }) {
  const { locale } = ctx
  const t = getDict(locale)
  const img = firstImage(course.gallery)
  const href = `/${locale}/courses/${course.slug}`
  const next = departuresFor(ctx.departures, 'course', course.id)[0]
  return (
    <article className="ct ft">
      <div className="ph">
        {img && (
          <Image src={img.url!} alt={img.alt ?? ''} fill sizes="(max-width: 700px) 100vw, 800px" style={{ objectFit: 'cover' }} />
        )}
        <span className="shade" />
      </div>
      <div className="bd">
        <span className="tag">{t.home.popular}</span>
        <h3>
          <Link href={href}>{course.title}</Link>
        </h3>
        {course.summary && <p className="s">{course.summary}</p>}
        {courseFacts(locale, course, next)}
        <div className="ftrow">
          <Price locale={locale} price={course.price} pct={ctx.shopPct} />
          <div className="act">
            <BookCourse ctx={ctx} course={course} className="pill y sm" />
            <Link className="more" href={href}>
              {t.common.more}
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}

// "More courses" list tile
export function MoreCourses({
  ctx,
  title,
  courses,
  photo,
  allHref,
}: {
  ctx: BookCtx
  title: string
  courses: Course[]
  photo?: unknown
  allHref?: string
}) {
  const { locale } = ctx
  const t = getDict(locale)
  const img = mediaOf(photo)
  return (
    <article className="ct">
      <div className="ph">
        {img && (
          <Image src={img.url!} alt="" fill sizes="(max-width: 700px) 100vw, 400px" style={{ objectFit: 'cover' }} />
        )}
      </div>
      <div className="bd">
        <h3>{title}</h3>
        <ul className="ol">
          {courses.map((c) => (
            <li key={c.id}>
              <Link href={`/${locale}/courses/${c.slug}`}>
                {c.title}
                <small>
                  {money(c.price)} · {t.common.deposit} {money(depositOf(c.price, ctx.shopPct))}
                </small>
              </Link>
              <Link className="go" href={`/${locale}/courses/${c.slug}`}>
                {t.common.more}
              </Link>
            </li>
          ))}
        </ul>
        {allHref && (
          <p style={{ marginTop: 18 }}>
            <Link className="more" href={allHref}>
              {t.courses.backAll}
            </Link>
          </p>
        )}
      </div>
    </article>
  )
}

// A departure in the home rail: trip photo, seats badge, dates and price
export function DepartureCard({ ctx, trip, dep }: { ctx: BookCtx; trip: Trip; dep: Departure }) {
  const { locale } = ctx
  const t = getDict(locale)
  const img = firstImage(trip.gallery)
  const left = seatsLeft(dep)
  const pct = tripDepositPct(trip, ctx.shopPct)
  const href = `/${locale}/trips/${trip.slug}`
  const sites = (trip.diveSites ?? [])
    .flatMap((s) => (typeof s === 'object' && s ? [s.region || s.name] : []))
    .filter(Boolean)
  return (
    <article className={`tc${left > 0 ? '' : ' full'}`} data-month={monthKey(dep.startDate)}>
      <Link className="ph" href={href} tabIndex={-1}>
        {img && <Image src={img.url!} alt={img.alt ?? ''} fill sizes="300px" style={{ objectFit: 'cover' }} />}
        <Seats left={left} locale={locale} />
      </Link>
      <div className="tb">
        <p className="pl">
          {[t.trips.type[trip.type], [...new Set(sites)][0]].filter(Boolean).join(' · ')}
        </p>
        <h3>
          <Link href={href}>{trip.title}</Link>
        </h3>
        <p className="dt">{dateRange(locale, dep.startDate, dep.endDate)}</p>
        {trip.levelRequired && <p className="rt">{t.trips.level[trip.levelRequired]}</p>}
        <div className="tf">
          <div>
            <span className="fr">{t.common.from}</span>
            <b className="num">{money(trip.price)}</b>
            <span className="dp">
              {t.common.depositPct(pct)} {money(depositOf(trip.price, pct))}
            </span>
          </div>
          {left > 0 && <BookTrip ctx={ctx} trip={trip} departureId={dep.id} />}
        </div>
      </div>
    </article>
  )
}

// A trip in the /trips grid, with its next open departure
export function TripCard({ ctx, trip, month }: { ctx: BookCtx; trip: Trip; month?: string | null }) {
  const { locale } = ctx
  const t = getDict(locale)
  const img = firstImage(trip.gallery)
  const deps = departuresFor(ctx.departures, 'trip', trip.id).filter(
    (d) => !month || monthKey(d.startDate) === month,
  )
  const next = deps.find((d) => seatsLeft(d) > 0) ?? deps[0]
  const left = next ? seatsLeft(next) : null
  const pct = tripDepositPct(trip, ctx.shopPct)
  const href = `/${locale}/trips/${trip.slug}`
  const days = tripDays(trip)
  return (
    <article className={`tc${left === 0 ? ' full' : ''}`}>
      <Link className="ph" href={href} tabIndex={-1}>
        {img && <Image src={img.url!} alt={img.alt ?? ''} fill sizes="(max-width: 700px) 100vw, 400px" style={{ objectFit: 'cover' }} />}
        {left !== null && <Seats left={left} locale={locale} />}
      </Link>
      <div className="tb">
        <p className="pl">
          {[t.trips.type[trip.type], days ? t.common.days(days) : null].filter(Boolean).join(' · ')}
        </p>
        <h3>
          <Link href={href}>{trip.title}</Link>
        </h3>
        <p className="dt">
          {next ? `${t.trips.nextDate} ${dateRange(locale, next.startDate, next.endDate)}` : t.trips.noDate}
        </p>
        {trip.levelRequired && <p className="rt">{t.trips.level[trip.levelRequired]}</p>}
        <div className="tf">
          <div>
            <span className="fr">{t.common.from}</span>
            <b className="num">{money(trip.price)}</b>
            <span className="dp">
              {t.common.depositPct(pct)} {money(depositOf(trip.price, pct))}
            </span>
          </div>
          <BookTrip ctx={ctx} trip={trip} departureId={next?.id} />
        </div>
      </div>
    </article>
  )
}

export function PostCard({ locale, post, priority }: { locale: Locale; post: Post; priority?: boolean }) {
  const t = getDict(locale)
  const img = mediaOf(post.cover)
  const mins = readingMinutes(`${post.excerpt ?? ''}\n${plainText(post.content)}`, locale)
  return (
    <Link className="ac" href={`/${locale}/articles/${post.slug}`}>
      <div className="ph">
        {img && (
          <Image src={img.url!} alt="" fill sizes="(max-width: 700px) 100vw, 400px" priority={priority} style={{ objectFit: 'cover' }} />
        )}
      </div>
      <div className="ab2">
        <p className="m">
          {t.blog.category[post.category]} · {t.common.minRead(mins)}
        </p>
        <h3>{post.title}</h3>
        {post.excerpt && <p className="x">{post.excerpt}</p>}
        <span className="more">{t.common.read}</span>
      </div>
    </Link>
  )
}

export function ProductCard({ locale, product }: { locale: Locale; product: ProductWithVariants }) {
  const t = getDict(locale)
  const img = firstImage(product.images)
  const inStock = product.sizes.filter((v) => (v.stock ?? 0) > 0)
  const prices = product.sizes.map((v) => v.price ?? 0)
  const min = prices.length ? Math.min(...prices) : null
  const href = `/${locale}/equipment/${product.slug}`
  return (
    <article className="pd">
      <Link className="pim" href={href} tabIndex={-1} aria-hidden="true">
        {img ? (
          <Image src={img.url!} alt="" fill sizes="(max-width: 700px) 50vw, 280px" style={{ objectFit: 'cover' }} />
        ) : (
          <>
            <GearIcon category={product.category} />
            <span className="dp-cap">{t.gear.photo}</span>
          </>
        )}
      </Link>
      <h3>
        <Link href={href}>{product.title}</Link>
      </h3>
      <p className="c">
        {[product.brand, product.category ? t.gear.category[product.category] : null].filter(Boolean).join(' · ')}
      </p>
      {product.sizes.length > 0 && (
        <div className="sz" aria-label={t.gear.sizes}>
          {product.sizes.map((v) => (
            <span key={v.id} className={(v.stock ?? 0) > 0 ? undefined : 'out'}>
              {v.size || v.sku}
            </span>
          ))}
        </div>
      )}
      <div className="row">
        <b className="num">
          {min !== null ? `${prices.some((p) => p !== min) ? `${t.common.from} ` : ''}${money(min)}` : ''}
        </b>
        {inStock.length === 0 && product.sizes.length > 0 ? (
          <span className="c">{t.gear.outOfStock}</span>
        ) : (
          <Link className="pill o sm" href={href}>
            {t.common.more}
          </Link>
        )}
      </div>
    </article>
  )
}
