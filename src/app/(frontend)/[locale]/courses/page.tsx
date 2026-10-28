import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { isLocale } from '@/i18n/config'
import { departuresFor, firstImage, getSite, listCourses, listDepartures } from '@/lib/content'
import { bookingContact } from '@/site/booking'
import { CourseTile, type BookCtx } from '@/site/components/cards'
import { PageIntro } from '@/site/components/PageIntro'
import { courseLevel, monthKey, monthLabel } from '@/site/format'
import { getDict } from '@/site/i18n'
import { pageMeta } from '@/site/seo'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const LEVELS = ['beginner', 'continuing', 'pro'] as const
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const t = getDict(locale)
  const courses = await listCourses(locale)
  return pageMeta({
    locale,
    path: '/courses',
    title: `${t.courses.eb} · ${t.courses.title}`,
    description: t.courses.lede,
    image: courses.map((c) => firstImage(c.gallery)).find(Boolean),
  })
}

export default async function CoursesPage({ params, searchParams }: Props) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const sp = await searchParams
  const t = getDict(locale)
  const [site, courses, departures] = await Promise.all([
    getSite(locale),
    listCourses(locale),
    listDepartures('course'),
  ])
  const ctx: BookCtx = { locale, contact: bookingContact(site), shopPct: site?.depositPct ?? 30, departures }
  const level = (LEVELS as readonly string[]).includes(one(sp.level)) ? one(sp.level) : ''
  const month = /^\d{4}-\d{2}$/.test(one(sp.month)) ? one(sp.month) : ''
  const levels = LEVELS.filter((l) => courses.some((c) => courseLevel(c) === l))
  const shown = courses.filter(
    (c) =>
      (!level || courseLevel(c) === level) &&
      (!month || departuresFor(departures, 'course', c.id).some((d) => monthKey(d.startDate) === month)),
  )
  const href = (l: string) => `/${locale}/courses${l ? `?level=${l}` : ''}`

  return (
    <>
      <PageIntro locale={locale} eb={t.courses.eb} title={t.courses.title} lede={t.courses.lede} />
      <section className="sec tight">
        <div className="w">
          {levels.length > 1 && (
            <nav className="chips c" aria-label={t.courses.filterLevel} style={{ marginTop: 0 }}>
              <Link href={href('')} aria-current={!level && !month ? 'true' : undefined} scroll={false}>
                {t.common.all}
              </Link>
              {levels.map((l) => (
                <Link key={l} href={href(l)} aria-current={level === l ? 'true' : undefined} scroll={false}>
                  {t.courses.level[l]}
                </Link>
              ))}
              {month && <span aria-current="true">{monthLabel(locale, month)}</span>}
            </nav>
          )}
        </div>
      </section>
      <section className="sec gry" style={{ paddingTop: 56 }}>
        <div className="w">
          {shown.length > 0 ? (
            <div className="cg" style={{ marginTop: 0 }}>
              {shown.map((c) => (
                <CourseTile key={c.id} ctx={ctx} course={c} />
              ))}
            </div>
          ) : (
            <p className="empty">{t.common.empty}</p>
          )}
        </div>
      </section>
    </>
  )
}
