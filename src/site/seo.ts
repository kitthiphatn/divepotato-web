import type { Metadata } from 'next'

import { locales, type Locale } from '@/i18n/config'
import { mediaOf } from '@/lib/content'

export const siteUrl = () =>
  (process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3006').replace(/\/$/, '')

export const absUrl = (path: string) => (/^https?:/i.test(path) ? path : `${siteUrl()}${path}`)

// Canonical URL plus hreflang alternates for both languages (and x-default → Thai)
export function alternatesFor(locale: Locale, path: string): Metadata['alternates'] {
  const p = path === '/' ? '' : path
  return {
    canonical: `/${locale}${p}`,
    languages: {
      ...Object.fromEntries(locales.map((l) => [l, `/${l}${p}`])),
      'x-default': `/th${p}`,
    },
  }
}

type SeoGroup = { title?: string | null; description?: string | null; image?: unknown } | null

// Metadata of one page: the SEO fields win, then the page's own title/summary/photo
export function pageMeta(opts: {
  locale: Locale
  path: string
  title: string
  description?: string | null
  seo?: SeoGroup
  image?: unknown
  type?: 'website' | 'article'
  publishedTime?: string | null
  absoluteTitle?: boolean
}): Metadata {
  const title = opts.seo?.title || opts.title
  const description = (opts.seo?.description || opts.description || '').slice(0, 300) || undefined
  const img = mediaOf(opts.seo?.image) ?? mediaOf(opts.image)
  const images = img?.url
    ? [{ url: img.url, width: img.width ?? undefined, height: img.height ?? undefined, alt: img.alt ?? '' }]
    : undefined
  return {
    title: opts.absoluteTitle ? { absolute: title } : title,
    description,
    alternates: alternatesFor(opts.locale, opts.path),
    openGraph: {
      title,
      description,
      url: `/${opts.locale}${opts.path === '/' ? '' : opts.path}`,
      locale: opts.locale === 'th' ? 'th_TH' : 'en_US',
      alternateLocale: opts.locale === 'th' ? 'en_US' : 'th_TH',
      type: opts.type ?? 'website',
      ...(opts.publishedTime ? { publishedTime: opts.publishedTime } : {}),
      ...(images ? { images } : {}),
    },
    twitter: { card: images ? 'summary_large_image' : 'summary', title, description },
  }
}

// <script type="application/ld+json"> body; "<" is escaped so text can't close the tag
export const jsonLd = (data: unknown) => ({
  __html: JSON.stringify(data).replace(/</g, '\\u003c'),
})
