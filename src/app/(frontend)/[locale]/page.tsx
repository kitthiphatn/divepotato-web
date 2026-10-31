import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { isLocale } from '@/i18n/config'
import {
  departuresFor,
  firstImage,
  getAbout,
  getHomeSections,
  getSite,
  listCourses,
  listDepartures,
  listFaqs,
  listPosts,
  listProducts,
  listTrips,
  mediaOf,
} from '@/lib/content'
import type { Media, Trip } from '@/payload-types'
import { bookingContact } from '@/site/booking'
import {
  BookCourse,
  BookTrip,
  CourseTile,
  DepartureCard,
  FeaturedCourse,
  MoreCourses,
  PostCard,
  ProductCard,
  type BookCtx,
} from '@/site/components/cards'
import { HeroCarousel, type HeroSlide } from '@/site/components/HeroCarousel'
import { MobileBar } from '@/site/components/MobileBar'
import { MonthRail } from '@/site/components/MonthRail'
import { QuickSearch } from '@/site/components/QuickSearch'
import { socialsOf } from '@/site/components/Footer'
import {
  cleanContact,
  dateRange,
  depositOf,
  featuredCourse,
  localHref,
  money,
  monthKey,
  monthLabel,
  tripDepositPct,
} from '@/site/format'
import { getDict } from '@/site/i18n'
import { absUrl, jsonLd, pageMeta } from '@/site/seo'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const [site, home] = await Promise.all([getSite(locale), getHomeSections(locale)])
  const s = site?.settings
  const siteName = s?.siteName || 'Dive Potato Scuba Diving'
  return pageMeta({
    locale,
    path: '/',
    title: s?.hero?.title ? `${siteName} · ${s.hero.title}` : siteName,
    absoluteTitle: true,
    description: s?.hero?.subtitle,
    image: s?.hero?.background ?? home?.heroSlides?.[0]?.image,
  })
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const t = getDict(locale)
  const [site, home, about, courses, trips, departures, posts, faqs, products] = await Promise.all([
    getSite(locale),
    getHomeSections(locale),
    getAbout(locale),
    listCourses(locale),
    listTrips(locale),
    listDepartures('all'),
    listPosts(locale, null, 1, 3),
    listFaqs(locale, true),
    listProducts(locale),
  ])
  const shopPct = site?.depositPct ?? 30
  const ctx: BookCtx = { locale, contact: bookingContact(site), shopPct, departures }
  const s = site?.settings
  const siteName = s?.siteName || 'Dive Potato Scuba Diving'

  // Hero: the slides from the home-sections global, or the single hero from site settings
  const slides: HeroSlide[] = (home?.heroSlides ?? []).map((sl) => {
    const img = mediaOf(sl.image)
    const href = localHref(locale, sl.buttonLink)
    return {
      title: sl.title,
      subtitle: sl.subtitle,
      button: sl.buttonLabel && href ? { label: sl.buttonLabel, href } : null,
      image: img?.url ? { url: img.url, alt: img.alt ?? '', width: img.width, height: img.height } : null,
    }
  })
  if (slides.length === 0) {
    const bg = mediaOf(s?.hero?.background)
    slides.push({
      title: s?.hero?.title || siteName,
      subtitle: s?.hero?.subtitle,
      button: { label: t.home.allTrips, href: `/${locale}/trips` },
      image: bg?.url ? { url: bg.url, alt: bg.alt ?? '', width: bg.width, height: bg.height } : null,
    })
  }

  const showCourses = home?.showCourses !== false && courses.length > 0
  const showTrips = home?.showTrips !== false
  const showNews = home?.showNews !== false && (posts?.docs.length ?? 0) > 0
  const showFaq = home?.showFaq !== false && faqs.length > 0

  const ow = featuredCourse(courses)
  const others = courses.filter((c) => c.id !== ow?.id)
  const tiles = others.slice(0, 3)
  const rest = others.slice(3)

  const tripById = new Map(trips.map((tr) => [tr.id, tr]))
  const tripDeps = departures.flatMap((d) => {
    const tr = d.kind === 'trip' ? tripById.get(typeof d.trip === 'object' ? d.trip?.id ?? 0 : d.trip ?? 0) : null
    return tr && tr.type !== 'overseas' ? [{ dep: d, trip: tr }] : []
  })
  const monthCounts = new Map<string, number>()
  for (const { dep } of tripDeps) monthCounts.set(monthKey(dep.startDate), (monthCounts.get(monthKey(dep.startDate)) ?? 0) + 1)
  const months = [...monthCounts].map(([key, count]) => ({ key, count, label: monthLabel(locale, key) }))
  const overseas = trips.filter((tr) => tr.type === 'overseas')

  // Gallery: photos from trips, courses and dive sites, each once
  const seen = new Set<number>()
  const gallery: Media[] = []
  for (const list of [...trips.map((x) => x.gallery), ...courses.map((x) => x.gallery)])
    for (const m of list ?? []) {
      const media = mediaOf(m)
      if (media && !seen.has(media.id)) {
        seen.add(media.id)
        gallery.push(media)
      }
    }

  // Trip photos the course grid can borrow for courses that have none
  const spare = gallery.filter((g) => !courses.some((co) => firstImage(co.gallery)?.id === g.id))
  const owPct = shopPct
  const quickMonths = [...new Set(departures.map((d) => monthKey(d.startDate)))]
    .sort()
    .slice(0, 8)
    .map((key) => ({ key, label: monthLabel(locale, key) }))

  const c = s?.contact
  const phone = cleanContact(c?.phone)
  const ld = {
    '@context': 'https://schema.org',
    '@type': ['SportsActivityLocation', 'LocalBusiness'],
    '@id': absUrl(`/${locale}#business`),
    name: siteName,
    url: absUrl(`/${locale}`),
    description: s?.hero?.subtitle || undefined,
    image: mediaOf(s?.hero?.background)?.url ? absUrl(mediaOf(s?.hero?.background)!.url!) : undefined,
    logo: absUrl(mediaOf(s?.logo)?.url ?? '/site/logo.webp'),
    telephone: phone || undefined,
    email: c?.email || undefined,
    address: c?.address ? { '@type': 'PostalAddress', streetAddress: c.address, addressCountry: 'TH' } : undefined,
    openingHours: undefined,
    sameAs: socialsOf(c).map((x) => x.url),
    priceRange: '฿฿',
  }
  const faqLd = showFaq
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((f) => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: { '@type': 'Answer', text: f.answer },
        })),
      }
    : null

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(faqLd)} />}

      <HeroCarousel slides={slides} labels={{ region: t.hero.slides, slide: t.hero.slide, of: t.hero.of }} />

      <section className="qb" aria-label={t.quick.label}>
        <div className="w">
          <QuickSearch
            locale={locale}
            labels={{
              label: t.quick.label,
              kind: t.quick.kind,
              courses: t.quick.courses,
              trips: t.quick.trips,
              funDive: t.quick.funDive,
              month: t.quick.month,
              anyMonth: t.quick.anyMonth,
              people: t.quick.people,
              search: t.quick.search,
            }}
            months={quickMonths}
            people={[1, 2, 3, 4, 5, 6].map((n) => t.quick.person(n))}
          />
          <p className="qnote">{t.quick.note(shopPct)}</p>
        </div>
      </section>

      <Statement siteName={siteName} title={s?.hero?.title} lede={s?.hero?.subtitle} stats={about?.stats ?? []} />

      {showCourses && ow && (
        <section className="sec gry" id="courses">
          <div className="w">
            <div className="intro">
              <span className="eb">{t.home.coursesEb}</span>
              <h2 className="h2 dsp">{t.home.coursesH}</h2>
              <p className="lede">{t.home.coursesLede(shopPct)}</p>
            </div>
            <div className="cg">
              <FeaturedCourse ctx={ctx} course={ow} />
              {tiles.map((co, i) => (
                <CourseTile key={co.id} ctx={ctx} course={co} fallback={spare[i]} />
              ))}
              {rest.length > 0 ? (
                <MoreCourses ctx={ctx} title={t.home.moreCourses} courses={rest} photo={firstImage(rest[0].gallery)} />
              ) : tiles.length === 3 ? (
                <MoreCourses
                  ctx={ctx}
                  title={t.nav.courses}
                  courses={courses}
                  photo={spare[tiles.length]}
                  allHref={`/${locale}/courses`}
                />
              ) : null}
            </div>
          </div>
        </section>
      )}

      {showTrips && (
        <section className="sec" id="trips">
          <div className="w">
            <MonthRail
              months={months}
              allLabel={t.common.all}
              total={tripDeps.length}
              prevLabel={t.common.prev}
              nextLabel={t.common.next}
              head={
                <div>
                  <span className="eb">{t.home.tripsEb}</span>
                  <h2 className="h2 dsp">{t.home.tripsH}</h2>
                  <p className="lede">{t.home.tripsLede}</p>
                </div>
              }
            >
              {tripDeps.map(({ dep, trip }) => (
                <DepartureCard key={dep.id} ctx={ctx} trip={trip} dep={dep} />
              ))}
            </MonthRail>
            {tripDeps.length === 0 && <p className="empty">{t.home.noDepartures}</p>}
            <p className="note">
              <Link className="more" href={`/${locale}/trips`}>
                {t.home.allTrips}
              </Link>
            </p>
          </div>
        </section>
      )}

      {showTrips && overseas.length > 0 && (
        <section id="expeditions" aria-label={t.home.expH}>
          <div className="sec blk xi">
            <div className="w intro">
              <span className="eb">{t.home.expEb}</span>
              <h2 className="h2 dsp">{t.home.expH}</h2>
              <p className="lede">{t.home.expLede}</p>
            </div>
          </div>
          {overseas.map((tr) => (
            <Expedition key={tr.id} ctx={ctx} trip={tr} />
          ))}
        </section>
      )}

      {gallery.length >= 6 && (
        <section className="sec blk" aria-label={t.home.galleryH}>
          <div className="w">
            <div className="intro">
              <span className="eb">{t.home.galleryEb}</span>
              <h2 className="h2 dsp">{t.home.galleryH}</h2>
            </div>
            <div className="gal">
              {galleryCells(gallery).map(({ m, tall, hideMobile }) => (
                <figure
                  key={m.id}
                  className={[tall ? 't' : '', hideMobile ? 'hm' : ''].filter(Boolean).join(' ') || undefined}
                >
                  <Image src={m.url!} alt={m.alt ?? ''} fill sizes="(max-width: 700px) 50vw, 400px" style={{ objectFit: 'cover' }} />
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {products.length > 0 && (
        <section className="sec" id="gear">
          <div className="w">
            <div className="intro">
              <span className="eb">{t.home.gearEb}</span>
              <h2 className="h2 dsp">{t.home.gearH}</h2>
              <p className="lede">{t.home.gearLede}</p>
            </div>
            <div className="chips c" role="list">
              {[...new Set(products.map((p) => p.category).filter(Boolean))].map((cat) => (
                <Link key={cat} role="listitem" href={`/${locale}/equipment?cat=${cat}`}>
                  {t.gear.category[cat!]}
                </Link>
              ))}
            </div>
            <div className="pg">
              {products.slice(0, 8).map((p) => (
                <ProductCard key={p.id} locale={locale} product={p} />
              ))}
            </div>
            <p className="promo">
              <Link className="more" href={`/${locale}/equipment`}>
                {t.home.allGear}
              </Link>
            </p>
          </div>
        </section>
      )}

      {about && (about.title || about.intro) && (
        <section className="sec blk" id="about">
          <div className="w">
            <div className="ab">
              <div className="ph">
                {mediaOf(about.image) && (
                  <Image src={mediaOf(about.image)!.url!} alt={mediaOf(about.image)!.alt ?? ''} fill sizes="(max-width: 860px) 100vw, 640px" style={{ objectFit: 'cover' }} />
                )}
              </div>
              <div>
                <span className="eb">{t.about.eb}</span>
                {about.title && <h2 className="h2 dsp">{about.title}</h2>}
                {about.intro && <p className="lede">{about.intro}</p>}
                {(home?.services?.length ?? 0) > 0 && (
                  <ul className="pts">
                    {home!.services!.map((sv) => (
                      <li key={sv.id}>
                        <b>{sv.title}</b>
                        <span>{sv.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <p style={{ marginTop: 24 }}>
                  <Link className="more" href={`/${locale}/about`}>
                    {t.home.aboutMore}
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {showNews && (
        <section className="sec gry" id="blog">
          <div className="w">
            <div className="th">
              <div>
                <span className="eb">{t.home.blogEb}</span>
                <h2 className="h2 dsp">{t.home.blogH}</h2>
              </div>
              <Link className="more" href={`/${locale}/articles`}>
                {t.home.allPosts}
              </Link>
            </div>
            <div className="ag">
              {posts!.docs.map((p) => (
                <PostCard key={p.id} locale={locale} post={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {showFaq && (
        <section className="sec" id="faq">
          <div className="w">
            <div className="intro">
              <span className="eb">{t.home.faqEb}</span>
              <h2 className="h2 dsp">{t.home.faqH}</h2>
            </div>
            <div className="faq">
              {faqs.map((f) => (
                <details key={f.id}>
                  <summary>{f.question}</summary>
                  <p>{f.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {ow && (
        <MobileBar>
          <span>
            <b>{ow.title}</b>
            {money(ow.price)} · {t.common.deposit} {money(depositOf(ow.price, owPct))}
          </span>
          <BookCourse ctx={ctx} course={ow} className="pill y" label={t.home.mbarBook} />
        </MobileBar>
      )}
    </>
  )
}

function Statement({
  siteName,
  title,
  lede,
  stats,
}: {
  siteName: string
  title?: string | null
  lede?: string | null
  stats: { id?: string | null; value: string; label: string }[]
}) {
  if (!title && !lede && stats.length === 0) return null
  return (
    <section className="sec stm" aria-label={siteName}>
      <div className="w intro" style={{ maxWidth: 960 }}>
        <span className="eb">{siteName}</span>
        {title && <h2 className="h2 dsp">{title}</h2>}
        {lede && <p className="lede">{lede}</p>}
        {stats.length > 0 && (
          <div className="stats" style={{ '--n': Math.min(stats.length, 4) } as React.CSSProperties}>
            {stats.map((st, i) => (
              <div key={st.id ?? i}>
                <b>{st.value}</b>
                <span>{st.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function Expedition({ ctx, trip }: { ctx: BookCtx; trip: Trip }) {
  const { locale } = ctx
  const t = getDict(locale)
  const imgs = (trip.gallery ?? []).map(mediaOf).filter((m): m is Media => Boolean(m?.url))
  const pct = tripDepositPct(trip, ctx.shopPct)
  const next = departuresFor(ctx.departures, 'trip', trip.id)[0]
  const kicker = [t.trips.type.overseas, next ? dateRange(locale, next.startDate, next.endDate) : null]
    .filter(Boolean)
    .join(' · ')
  return (
    <div className="pn" id={`x-${trip.slug}`}>
      <div className={`bgp${imgs.length > 1 ? ' duo' : ''}`}>
        {imgs.slice(0, imgs.length > 1 ? 2 : 1).map((m) => (
          <span key={m.id} style={{ position: 'relative', display: 'block', height: '100%' }}>
            <Image src={m.url!} alt={m.alt ?? ''} fill sizes={imgs.length > 1 ? '(max-width: 700px) 100vw, 50vw' : '100vw'} style={{ objectFit: 'cover' }} />
          </span>
        ))}
      </div>
      <div className="scr" />
      <div className="stx">
        <p className="k">{kicker}</p>
        <h3 className="ttl dsp">{trip.title}</h3>
        {trip.summary && <p className="sub">{trip.summary}</p>}
      </div>
      <div className="pp">
        <p>
          {t.common.from} {money(trip.price)} · {t.common.depositPct(pct)} {money(depositOf(trip.price, pct))}
        </p>
        <div>
          <BookTrip ctx={ctx} trip={trip} className="pill wh" />
          <Link className="pill d" href={`/${locale}/trips/${trip.slug}`}>
            {t.common.more}
          </Link>
        </div>
      </div>
    </div>
  )
}

// Gallery grid: portrait photos take two rows. Pick photos so the three-column grid ends
// flush (cells a multiple of 3), and hide one photo on phones if the two-column grid would not.
function galleryCells(photos: Media[], target = 12) {
  const out: { m: Media; tall: boolean; hideMobile: boolean }[] = []
  let cells = 0
  for (const m of photos) {
    if (cells >= target) break
    const tall = (m.height ?? 0) > (m.width ?? 0) && target - cells >= 2 && out.filter((x) => x.tall).length < 3
    out.push({ m, tall, hideMobile: false })
    cells += tall ? 2 : 1
  }
  while (cells % 3 !== 0) {
    const t = lastIndex(out, (x) => x.tall)
    if (t >= 0) out[t].tall = false
    else out.pop()
    cells -= 1
  }
  if (cells % 2 !== 0) {
    const last = lastIndex(out, (x) => !x.tall)
    if (last >= 0) out[last].hideMobile = true
  }
  return out
}

function lastIndex<T>(list: T[], test: (x: T) => boolean) {
  for (let i = list.length - 1; i >= 0; i--) if (test(list[i])) return i
  return -1
}
