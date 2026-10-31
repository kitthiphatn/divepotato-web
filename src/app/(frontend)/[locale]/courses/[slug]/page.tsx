import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { isLocale } from '@/i18n/config'
import { departuresFor, firstImage, getCourse, getSite, listDepartures, mediaOf, seatsLeft } from '@/lib/content'
import type { Media } from '@/payload-types'
import { bookingContact } from '@/site/booking'
import { BookCourse, type BookCtx } from '@/site/components/cards'
import { MobileBar } from '@/site/components/MobileBar'
import { Schedule } from '@/site/components/Schedule'
import { courseLevel, dateRange, depositOf, money } from '@/site/format'
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
  const course = await getCourse(locale, slug)
  if (!course) return {}
  return pageMeta({
    locale,
    path: `/courses/${course.slug}`,
    title: course.title,
    description: course.summary,
    seo: course.seo,
    image: firstImage(course.gallery),
  })
}

export default async function CoursePage({ params }: Props) {
  const { locale, slug } = await params
  if (!isLocale(locale)) notFound()
  const [course, site, all] = await Promise.all([getCourse(locale, slug), getSite(locale), listDepartures('course')])
  if (!course) notFound()
  const t = getDict(locale)
  const pct = site?.depositPct ?? 30
  const ctx: BookCtx = { locale, contact: bookingContact(site), shopPct: pct, departures: all }
  const deps = departuresFor(all, 'course', course.id)
  const next = deps.find((d) => seatsLeft(d) > 0)
  const gallery = (course.gallery ?? []).map(mediaOf).filter((m): m is Media => Boolean(m?.url))
  const hero = gallery[0]
  const lineUrl = ctx.contact.lineUrl
  const siteName = site?.settings.siteName || 'Dive Potato Scuba Diving'

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.title,
    description: course.seo?.description || course.summary || course.title,
    courseCode: course.padiCode || undefined,
    image: gallery.map((m) => absUrl(m.url!)),
    provider: { '@type': 'Organization', name: siteName, sameAs: absUrl(`/${locale}`) },
    offers: {
      '@type': 'Offer',
      category: 'Paid',
      price: course.price,
      priceCurrency: 'THB',
      url: absUrl(`/${locale}/courses/${course.slug}`),
    },
    hasCourseInstance: deps.slice(0, 10).map((d) => ({
      '@type': 'CourseInstance',
      courseMode: 'Onsite',
      startDate: d.startDate,
      endDate: d.endDate || d.startDate,
      ...(course.days ? { courseWorkload: `P${course.days}D` } : {}),
    })),
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
              <Link href={`/${locale}/courses`}>{t.nav.courses}</Link>
            </li>
          </ol>
          <h1 className="ttl dsp">{course.title}</h1>
          {course.summary && <p className="sub">{course.summary}</p>}
        </div>
      </section>

      <div className="w">
        <dl className="facts" style={{ '--n': 4 } as React.CSSProperties}>
          <div>
            <dt>{t.courses.code}</dt>
            <dd>{course.padiCode || '–'}</dd>
          </div>
          <div>
            <dt>{t.courses.filterLevel}</dt>
            <dd>{t.courses.level[courseLevel(course)]}</dd>
          </div>
          <div>
            <dt>{t.courses.duration}</dt>
            <dd>{course.days ? t.common.days(course.days) : '–'}</dd>
          </div>
          <div>
            <dt>{t.trips.pricePer}</dt>
            <dd className="num">
              {money(course.price)}
              <small>
                {t.common.depositPct(pct)} · {money(depositOf(course.price, pct))}
              </small>
            </dd>
          </div>
        </dl>
      </div>

      <section className="sec tight">
        <div className="w dl">
          <div>
            {course.description && (
              <div className="block">
                <RichText data={course.description} />
              </div>
            )}

            <div className="block" id="schedule">
              <h2>{t.courses.schedule}</h2>
              <p className="lede">{t.courses.scheduleLede}</p>
              {deps.length > 0 ? (
                <Schedule ctx={ctx} rows={deps.map((dep) => ({ dep, course }))} />
              ) : (
                <div className="sch-empty">
                  <span>{t.courses.noDepartures}</span>
                  {lineUrl && (
                    <a className="pill y sm" href={lineUrl} target="_blank" rel="noopener noreferrer">
                      {t.common.askLine}
                    </a>
                  )}
                </div>
              )}
            </div>

            {((course.prerequisites?.length ?? 0) > 0 || (course.includes?.length ?? 0) > 0) && (
              <div className="block">
                <div className="ie">
                  {(course.prerequisites?.length ?? 0) > 0 && (
                    <div>
                      <h3>{t.courses.prerequisites}</h3>
                      <ul className="ck">
                        {course.prerequisites!.map((i) => (
                          <li key={i.id}>{i.text}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(course.includes?.length ?? 0) > 0 && (
                    <div>
                      <h3>{t.courses.includes}</h3>
                      <ul className="ck">
                        {course.includes!.map((i) => (
                          <li key={i.id}>{i.text}</li>
                        ))}
                      </ul>
                    </div>
                  )}
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
                <b className="num">{money(course.price)}</b>
                <span className="dp">
                  {t.common.depositPct(pct)} · {money(depositOf(course.price, pct))}
                </span>
              </div>
              {next && (
                <p className="sub">
                  {t.courses.nextClass}: {dateRange(locale, next.startDate, next.endDate)} · {t.common.seatsLeft(seatsLeft(next))}
                </p>
              )}
              <BookCourse ctx={ctx} course={course} className="pill y" departureId={next?.id} />
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
          <b>{course.title}</b>
          {money(course.price)} · {t.common.deposit} {money(depositOf(course.price, pct))}
        </span>
        <BookCourse ctx={ctx} course={course} className="pill y" departureId={next?.id} label={t.home.mbarBook} />
      </MobileBar>
    </>
  )
}
