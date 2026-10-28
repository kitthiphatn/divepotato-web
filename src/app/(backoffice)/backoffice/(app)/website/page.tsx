import type { Metadata } from 'next'

import type { SlideInput } from '@/backoffice/actions/website'
import { mediaLibrary, mediaUrl, relId } from '@/backoffice/data'
import { ymd } from '@/backoffice/format'
import { requireUser } from '@/backoffice/server'
import { WebsiteEditor, type ArticleRow } from '@/backoffice/ui/Website'

export const metadata: Metadata = { title: 'หน้าเว็บไซต์ · Website' }

const TABS = ['slides', 'articles', 'ann'] as const

export default async function WebsitePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const s = await requireUser(['admin', 'editor'])
  const sp = await searchParams
  const tab = TABS.find((t) => t === sp.tab) ?? 'slides'
  const loc = (locale: 'th' | 'en') => ({ locale, fallbackLocale: false as const, depth: 0 })

  const [homeTh, homeEn, annTh, annEn, posts, library] = await Promise.all([
    s.payload.findGlobal({ slug: 'home-sections', ...loc('th'), ...s.as }),
    s.payload.findGlobal({ slug: 'home-sections', ...loc('en'), ...s.as }),
    s.payload.findGlobal({ slug: 'announcement', ...loc('th'), ...s.as }),
    s.payload.findGlobal({ slug: 'announcement', ...loc('en'), ...s.as }),
    s.payload.find({
      collection: 'posts',
      draft: true,
      sort: '-publishedAt',
      limit: 50,
      depth: 1,
      locale: s.lang,
      ...s.as,
    }),
    mediaLibrary(s),
  ])

  const enRows = new Map((homeEn.heroSlides ?? []).map((r) => [r.id, r]))
  const slides: SlideInput[] = (homeTh.heroSlides ?? []).map((r) => {
    const en = r.id ? enRows.get(r.id) : undefined
    return {
      id: r.id ?? null,
      image: relId(r.image),
      title: { th: r.title ?? '', en: en?.title ?? '' },
      subtitle: { th: r.subtitle ?? '', en: en?.subtitle ?? '' },
      buttonLabel: { th: r.buttonLabel ?? '', en: en?.buttonLabel ?? '' },
      buttonLink: r.buttonLink ?? '',
    }
  })

  const articles: ArticleRow[] = posts.docs.map((p) => ({
    id: p.id,
    title: p.title ?? '',
    category: p.category ?? 'news',
    date: p.publishedAt ? ymd(p.publishedAt) : '',
    published: p._status === 'published',
    cover: mediaUrl(p.cover),
  }))

  return (
    <WebsiteEditor
      lang={s.lang}
      tab={tab}
      slides={slides}
      announcement={{
        enabled: Boolean(annTh.enabled),
        tone: annTh.tone === 'warning' ? 'warning' : 'info',
        message: { th: annTh.message ?? '', en: annEn.message ?? '' },
        link: annTh.link ?? '',
      }}
      articles={articles}
      library={library}
    />
  )
}
