import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import '../globals.css'

import { isLocale, locales } from '@/i18n/config'
import { getSite } from '@/lib/content'

// Refresh at least once a minute; admin edits also refresh immediately via revalidate hooks
export const revalidate = 60

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3006'),
  title: { default: 'Dive Potato Scuba Diving', template: '%s · Dive Potato' },
  alternates: { languages: { th: '/th', en: '/en' } },
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
  const site = await getSite(locale)
  const siteName = site?.settings.siteName || 'Dive Potato Scuba Diving'
  const other = locale === 'th' ? 'en' : 'th'
  const announcement = site?.announcement

  return (
    <html lang={locale}>
      <body className="min-h-dvh bg-white text-neutral-900 antialiased">
        {announcement?.enabled && announcement.message && (
          <div className="bg-accent px-4 py-1.5 text-center text-sm text-black">
            {announcement.message}
          </div>
        )}
        <header className="border-b border-neutral-200">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <a href={`/${locale}`} className="text-lg font-semibold">
              {siteName}
            </a>
            <a href={`/${other}`} className="text-sm underline">
              {other === 'en' ? 'English' : 'ภาษาไทย'}
            </a>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <footer className="border-t border-neutral-200">
          <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-neutral-500">
            <p>{siteName}</p>
            {site?.settings.contact?.phone && <p>{site.settings.contact.phone}</p>}
            {site?.settings.contact?.lineId && <p>LINE: {site.settings.contact.lineId}</p>}
            {site?.settings.footerNote && <p>{site.settings.footerNote}</p>}
          </div>
        </footer>
      </body>
    </html>
  )
}
