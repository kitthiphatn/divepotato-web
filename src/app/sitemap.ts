import type { MetadataRoute } from 'next'

import { locales } from '@/i18n/config'
import { sitemapEntries } from '@/lib/content'
import { siteUrl } from '@/site/seo'

// Built per request (crawlers ask rarely): a build-time copy would come from the empty build database
export const dynamic = 'force-dynamic'

// Every public page in both languages, each with its hreflang alternates
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl()
  const { trips, courses, posts, products } = await sitemapEntries()
  const page = (
    path: string,
    priority: number,
    lastModified?: string,
  ): MetadataRoute.Sitemap[number] => ({
    url: `${base}/th${path}`,
    ...(lastModified ? { lastModified } : {}),
    changeFrequency: 'weekly',
    priority,
    alternates: { languages: Object.fromEntries(locales.map((l) => [l, `${base}/${l}${path}`])) },
  })
  return [
    page('', 1),
    page('/courses', 0.9),
    page('/trips', 0.9),
    page('/equipment', 0.6),
    page('/articles', 0.6),
    page('/about', 0.5),
    page('/contact', 0.5),
    ...courses.map((c) => page(`/courses/${c.slug}`, 0.8, c.updatedAt)),
    ...trips.map((t) => page(`/trips/${t.slug}`, 0.8, t.updatedAt)),
    ...posts.map((p) => page(`/articles/${p.slug}`, 0.5, p.updatedAt)),
    ...products.map((p) => page(`/equipment/${p.slug}`, 0.4, p.updatedAt)),
  ]
}
