import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { isLocale } from '@/i18n/config'
import {
  departuresFor,
  firstImage,
  getSite,
  getTrip,
  listDepartures,
  mediaOf,
  seatsLeft,
} from '@/lib/content'
import type { DiveSite, Media } from '@/payload-types'
import { bookingContact } from '@/site/booking'
import { BookTrip, type BookCtx } from '@/site/components/cards'
import { MobileBar } from '@/site/components/MobileBar'
import { Schedule } from '@/site/components/Schedule'
import { dateRange, departureDays, depositOf, money, tripDays, tripDepositPct } from '@/site/format'
import { getDict } from '@/site/i18n'
import { RichText } from '@/site/RichText'
import { absUrl, jsonLd, pageMeta } from '@/site/seo'

type Props = { params: Promise<{ locale: string; slug: string }> }

// Rendered on first request, then cached like the other pages (see the locale layout)
export function generateStaticParams() {
  return [] as { locale: string; slug: string }[]
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  if (!isLocale(locale)) return {}
  const trip = await getTrip(locale, slug)
  if (!trip) return {}
  return pageMeta({
    locale,
    path: `/trips/${trip.slug}`,
    title: trip.title,
    description: trip.summary,
    seo: trip.seo,
    image: firstImage(trip.gallery),
  })
}

export default async function TripPage({ params }: Props) {
  const { locale, slug } = await params
  if (!isLocale(locale)) notFound()
  const [trip, site, all] = await Promise.all([getTrip(locale, slug), getSite(locale), listDepartures('trip')])
  if (!trip) notFound()
  const t = getDict(locale)
  const shopPct = site?.depositPct ?? 30
  const ctx: BookCtx = { locale, contact: bookingContact(site), shopPct, departures: all }
  const pct = tripDepositPct(trip, shopPct)
  const deps = departuresFor(all, 'trip', trip.id)
  const next = deps.find((d) => seatsLeft(d) > 0)
  const days = tripDays(trip)
  const gallery = (trip.gallery ?? []).map(mediaOf).filter((m): m is Media => Boolean(m?.url))
  const hero = gallery[0]
  const sites = (trip.diveSites ?? []).filter((s): s is DiveSite => typeof s === 'object' && !!s)
  const lineUrl = ctx.contact.lineUrl

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: trip.title,
    description: trip.seo?.description || trip.summary || undefined,
    image: gallery.map((m) => absUrl(m.url!)),
    category: t.trips.type[trip.type],
    brand: { '@type': 'Brand', name: site?.settings.siteName || 'Dive Potato' },
    offers: {
      '@type': 'Offer',
      price: trip.price,
      priceCurrency: 'THB',
      url: absUrl(`/${locale}/trips/${trip.slug}`),
      availability: next ? 'https://schema.org/InStock' : 'https://schema.org/PreOrder',
    },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />
      <section className="hero phero short">
        <div className="bgp">
          {hero && <Image src={hero.url!} alt={hero.alt ?? ''} fill priority sizes="100vw" style={{ objectFit: 'cover' }} />}
        </div>
        <div className="scr" />
        <div className="stx">
          <ol className="crumbs">
            <li>
              <Link href={`/${locale}`}>{t.common.home}</Link>
            </li>
            <li>
              <Link href={`/${locale}/trips`}>{t.nav.trips}</Link>
            </li>
          </ol>
          <h1 className="ttl dsp">{trip.title}</h1>
          {trip.summary && <p className="sub">{trip.summary}</p>}
        </div>
      </section>

      <div className="w">
        <dl className="facts" style={{ '--n': 4 } as React.CSSProperties}>
          <div>
            <dt>{t.trips.filterType}</dt>
            <dd>{t.trips.type[trip.type]}</dd>
          </div>
          <div>
            <dt>{t.trips.levelReq}</dt>
            <dd>{trip.levelRequired ? t.trips.level[trip.levelRequired] : '–'}</dd>
          </div>
          <div>
            <dt>{t.trips.duration}</dt>
            <dd>{days ? t.common.days(days) : next ? t.common.days(departureDays(next)) : '–'}</dd>
          </div>
          <div>
            <dt>{t.trips.pricePer}</dt>
            <dd className="num">
              {money(trip.price)}
              <small>
                {t.common.depositPct(pct)} · {money(depositOf(trip.price, pct))}
              </small>
            </dd>
          </div>
        </dl>
      </div>

      <section className="sec tight">
        <div className="w dl">
          <div>
            {trip.description && (
              <div className="block">
                <RichText data={trip.description} />
              </div>
            )}

            <div className="block" id="schedule">
              <h2>{t.trips.schedule}</h2>
              <p className="lede">{t.trips.scheduleLede}</p>
              {deps.length > 0 ? (
                <Schedule ctx={ctx} rows={deps.map((dep) => ({ dep, trip }))} />
              ) : (
                <div className="sch-empty">
                  <span>{t.trips.noDepartures}</span>
                  {lineUrl && (
                    <a className="pill y sm" href={lineUrl} target="_blank" rel="noopener noreferrer">
                      {t.common.askLine}
                    </a>
                  )}
                </div>
              )}
            </div>

            {(trip.itinerary?.length ?? 0) > 0 && (
              <div className="block">
                <h2>{t.trips.itinerary}</h2>
                <ol className="iti">
                  {trip.itinerary!.map((row) => (
                    <li key={row.id}>
                      <span className="dn">
                        {t.trips.day}
                        <b className="num">{row.day}</b>
                      </span>
                      <div>
                        <h3>{row.title}</h3>
                        {row.text && <p>{row.text}</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {((trip.includes?.length ?? 0) > 0 || (trip.excludes?.length ?? 0) > 0) && (
              <div className="block">
                <div className="ie">
                  {(trip.includes?.length ?? 0) > 0 && (
                    <div>
                      <h3>{t.trips.includes}</h3>
                      <ul className="ck">
                        {trip.includes!.map((i) => (
                          <li key={i.id}>{i.text}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(trip.excludes?.length ?? 0) > 0 && (
                    <div>
                      <h3>{t.trips.excludes}</h3>
                      <ul className="xk">
                        {trip.excludes!.map((i) => (
                          <li key={i.id}>{i.text}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {sites.length > 0 && (
              <div className="block">
                <h2>{t.trips.sites}</h2>
                <div className="sites" style={{ marginTop: 20 }}>
                  {sites.map((s) => {
                    const img = mediaOf(s.image)
                    return (
                      <div className="site" key={s.id}>
                        <div className="ph">
                          {img && <Image src={img.url!} alt={img.alt ?? ''} fill sizes="(max-width: 700px) 50vw, 260px" style={{ objectFit: 'cover' }} />}
                        </div>
                        <h3>{s.name}</h3>
                        {s.region && <p className="r">{s.region}</p>}
                        {s.description && <p>{s.description}</p>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {gallery.length > 1 && (
              <div className="block">
                <h2>{t.trips.gallery}</h2>
                <div className="gl2" style={{ marginTop: 20 }}>
                  {gallery.map((m) => (
                    <figure key={m.id}>
                      <Image src={m.url!} alt={m.alt ?? ''} fill sizes="(max-width: 700px) 50vw, 260px" style={{ objectFit: 'cover' }} />
                    </figure>
                  ))}
                </div>
              </div>
            )}

            {site?.cancellationPolicy && (
              <div className="block">
                <h2>{t.trips.policy}</h2>
                <RichText data={site.cancellationPolicy} />
              </div>
            )}
          </div>

          <aside>
            <div className="box">
              <div className="pr">
                <span className="fr">{t.trips.pricePer}</span>
                <b className="num">{money(trip.price)}</b>
                <span className="dp">
                  {t.common.depositPct(pct)} · {money(depositOf(trip.price, pct))}
                </span>
              </div>
              {next && (
                <p className="sub">
                  {t.trips.nextDate}: {dateRange(locale, next.startDate, next.endDate)} · {t.common.seatsLeft(seatsLeft(next))}
                </p>
              )}
              <BookTrip ctx={ctx} trip={trip} className="pill y" departureId={next?.id} label={t.common.book} />
              {lineUrl && (
                <div className="alt">
                  <a className="pill o" href={lineUrl} target="_blank" rel="noopener noreferrer">
                    {t.common.askLine}
                  </a>
                </div>
              )}
              <p className="sub">{t.booking.fine}</p>
            </div>
          </aside>
        </div>
      </section>

      <MobileBar>
        <span>
          <b>{trip.title}</b>
          {money(trip.price)} · {t.common.deposit} {money(depositOf(trip.price, pct))}
        </span>
        <BookTrip ctx={ctx} trip={trip} className="pill y" departureId={next?.id} label={t.home.mbarBook} />
      </MobileBar>
    </>
  )
}
