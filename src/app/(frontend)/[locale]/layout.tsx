import type { Metadata, Viewport } from 'next'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import '../globals.css'

import { isLocale } from '@/i18n/config'
import { getSite, listCourses, mediaOf } from '@/lib/content'
import { Analytics } from '@/site/components/Analytics'
import { AnnouncementBar } from '@/site/components/AnnouncementBar'
import { CookieConsent } from '@/site/components/CookieConsent'
import { Footer } from '@/site/components/Footer'
import { Header } from '@/site/components/Header'
import { PopupSlides, type PopupSlide } from '@/site/components/PopupSlides'
import { cleanContact, featuredCourse, localHref, telHref } from '@/site/format'
import { getDict } from '@/site/i18n'
import { navItems } from '@/site/nav'
import { siteUrl } from '@/site/seo'

// Refresh at least once a minute; backoffice edits also refresh right away through the
// collections' and globals' revalidate hooks
export const revalidate = 60

// Nothing is pre-rendered at build time: the build runs against an empty throwaway database,
// so each page is rendered from the real database on its first request and then cached (ISR)
export function generateStaticParams() {
  return [] as { locale: string }[]
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#ffffff',
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const site = await getSite(locale)
  const siteName = site?.settings.siteName || 'Dive Potato Scuba Diving'
  const favicon = mediaOf(site?.settings.favicon)?.url ?? '/site/logo.webp'
  const share = mediaOf(site?.settings.hero?.background)
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: siteName, template: `%s · ${siteName}` },
    description: site?.settings.hero?.subtitle || undefined,
    applicationName: siteName,
    icons: { icon: favicon, apple: favicon },
    alternates: { languages: { th: '/th', en: '/en', 'x-default': '/th' } },
    openGraph: {
      siteName,
      locale: locale === 'th' ? 'th_TH' : 'en_US',
      type: 'website',
      ...(share?.url ? { images: [{ url: share.url, alt: share.alt ?? '' }] } : {}),
    },
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const t = getDict(locale)
  const [site, courses] = await Promise.all([getSite(locale), listCourses(locale)])
  const s = site?.settings
  const siteName = s?.siteName || 'Dive Potato Scuba Diving'
  const logo = mediaOf(s?.logo)?.url ?? '/site/logo.webp'
  const items = navItems(locale)
  const ow = featuredCourse(courses)
  const bookHref = ow ? `/${locale}/courses/${ow.slug}#schedule` : `/${locale}/courses`
  const phone = cleanContact(s?.contact?.phone)

  const ann = site?.announcement
  const popup = site?.popup
  const popupSlides: PopupSlide[] = (popup?.enabled ? (popup.slides ?? []) : []).flatMap((sl) => {
    const img = mediaOf(sl.image)
    if (!img?.url) return []
    return [
      {
        src: img.url,
        mobileSrc: mediaOf(sl.mobileImage)?.url ?? null,
        alt: img.alt ?? '',
        link: localHref(locale, sl.link),
      },
    ]
  })

  return (
    <html lang={locale}>
      <body>
        <a className="skip" href="#main">
          {t.nav.skip}
        </a>
        {ann?.enabled && ann.message && (
          <AnnouncementBar
            message={ann.message}
            tone={ann.tone === 'warning' ? 'warning' : 'info'}
            href={localHref(locale, ann.link)}
            startsAt={ann.startsAt}
            endsAt={ann.endsAt}
          />
        )}
        <Header
          locale={locale}
          siteName={siteName}
          logo={logo}
          items={items}
          bookHref={bookHref}
          phone={phone ? { label: phone, href: telHref(phone) } : null}
          labels={t.nav}
        />
        <main id="main">{children}</main>
        <Footer locale={locale} t={t} site={site} logo={logo} items={items} />
        {popupSlides.length > 0 && (
          <PopupSlides
            slides={popupSlides}
            version={popup?.updatedAt ?? ''}
            frequency={popup?.frequency === 'session' ? 'session' : 'day'}
            startsAt={popup?.startsAt}
            endsAt={popup?.endsAt}
            autoplaySeconds={popup?.autoplay ? (popup.autoplaySeconds ?? 5) : null}
            framed={popup?.framed ?? true}
            labels={t.popup}
          />
        )}
        <CookieConsent
          t={t.cookie}
          message={site?.cookie.message}
          policyUrl={localHref(locale, site?.cookie.policyUrl)}
        />
        {s?.analyticsId && <Analytics id={s.analyticsId.trim()} />}
      </body>
    </html>
  )
}
