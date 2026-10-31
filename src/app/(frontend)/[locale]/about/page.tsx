import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { isLocale } from '@/i18n/config'
import { getAbout, getHomeSections, getSite, mediaOf } from '@/lib/content'
import { getDict } from '@/site/i18n'
import { ServiceIcon } from '@/site/icons'
import { RichText } from '@/site/RichText'
import { pageMeta } from '@/site/seo'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const [about, site] = await Promise.all([getAbout(locale), getSite(locale)])
  return pageMeta({
    locale,
    path: '/about',
    title: about?.title || getDict(locale).nav.about,
    description: about?.intro,
    seo: about?.seo,
    image: about?.image ?? site?.settings.hero?.background,
  })
}

// About page, from the about-page global (title, intro, photo, key figures, body)
export default async function AboutPage({ params }: Props) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const t = getDict(locale)
  const [about, home] = await Promise.all([getAbout(locale), getHomeSections(locale)])
  const img = mediaOf(about?.image)
  const stats = about?.stats ?? []
  const services = home?.services ?? []

  return (
    <>
      <section className="hero phero short">
        <div className="bgp">
          {img && <Image src={img.url!} alt={img.alt ?? ''} fill priority sizes="100vw" style={{ objectFit: 'cover' }} />}
        </div>
        <div className="scr" />
        <div className="stx">
          <ol className="crumbs">
            <li>
              <Link href={`/${locale}`}>{t.common.home}</Link>
            </li>
            <li>{t.nav.about}</li>
          </ol>
          <h1 className="ttl dsp">{about?.title || t.nav.about}</h1>
          {about?.intro && <p className="sub">{about.intro}</p>}
        </div>
      </section>

      {stats.length > 0 && (
        <section className="sec tight">
          <div className="w">
            <div className="stats" style={{ marginTop: 0, '--n': Math.min(stats.length, 4) } as React.CSSProperties}>
              {stats.map((s, i) => (
                <div key={s.id ?? i}>
                  <b>{s.value}</b>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {about?.content && (
        <section className={`sec${stats.length ? ' gry' : ''}`}>
          <div className="w" style={{ maxWidth: 860 }}>
            <RichText data={about.content} />
          </div>
        </section>
      )}

      {services.length > 0 && (
        <section className="sec blk">
          <div className="w">
            <ul className="hl" style={{ '--n': Math.min(services.length, 3), marginTop: 0 } as React.CSSProperties}>
              {services.map((s) => (
                <li key={s.id} style={{ background: 'var(--d2)' }}>
                  <span style={{ color: 'var(--y)' }}>
                    <ServiceIcon icon={s.icon} />
                  </span>
                  <h3 style={{ color: '#fff' }}>{s.title}</h3>
                  {s.text && <p style={{ color: '#a1a1a6' }}>{s.text}</p>}
                </li>
              ))}
            </ul>
            <div className="act" style={{ justifyContent: 'center', marginTop: 48 }}>
              <Link className="pill y" href={`/${locale}/courses`}>
                {t.about.cta}
              </Link>
              <Link className="pill wh" href={`/${locale}/trips`}>
                {t.about.ctaTrips}
              </Link>
            </div>
          </div>
        </section>
      )}
    </>
  )
}
