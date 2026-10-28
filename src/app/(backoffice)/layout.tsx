import '@fontsource/ibm-plex-sans-thai/400.css'
import '@fontsource/ibm-plex-sans-thai/500.css'
import '@fontsource/ibm-plex-sans-thai/600.css'
import '@fontsource/ibm-plex-sans-thai/700.css'
import '@/backoffice/backoffice.css'

import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'

import { getLang, getTheme } from '@/backoffice/server'

export const metadata: Metadata = {
  title: { default: 'Dive Potato Backoffice', template: '%s · Dive Potato Backoffice' },
  icons: { icon: '/backoffice/logo.png' },
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

// Root layout of the staff backoffice (/backoffice); separate from the public site and the Payload admin panel
export default async function BackofficeRootLayout({ children }: { children: ReactNode }) {
  const [lang, theme] = await Promise.all([getLang(), getTheme()])
  return (
    <html lang={lang} data-theme={theme ?? undefined}>
      <body>{children}</body>
    </html>
  )
}
