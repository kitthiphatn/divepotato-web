import type { MetadataRoute } from 'next'

import { siteUrl } from '@/site/seo'

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl()
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api', '/backoffice'] },
    sitemap: `${base}/sitemap.xml`,
  }
}
