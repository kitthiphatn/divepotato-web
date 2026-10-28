import type { Metadata } from 'next'

import type { SlideInput } from '@/backoffice/actions/website'
import { mediaLibrary, mediaUrl, relId } from '@/backoffice/data'
import { ymd } from '@/backoffice/format'
import { WEB_TABS, type WebTab } from '@/backoffice/nav'
import { requireUser, type Session } from '@/backoffice/server'
import { lexicalToBlocks, newBlock } from '@/backoffice/blocks'
import { AboutEditor } from '@/backoffice/ui/AboutEditor'
import { HomeSectionsForm } from '@/backoffice/ui/HomeSections'
import { SiteInfoForm } from '@/backoffice/ui/SiteInfo'
import { SERVICE_ICON_KEYS } from '@/backoffice/website'
import { WebsiteEditor, type ArticleRow } from '@/backoffice/ui/Website'

export const metadata: Metadata = { title: 'หน้าเว็บไซต์ · Website' }

const loc = (locale: 'th' | 'en') => ({ locale, fallbackLocale: false as const, depth: 0 })

// /backoffice/website?tab=... : one screen per tab; each loads only what it shows
export default async function WebsitePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const s = await requireUser(['admin', 'editor'])
  const sp = await searchParams
  const tab: WebTab = WEB_TABS.find((t) => t === sp.tab) ?? 'slides'

  switch (tab) {
    case 'site':
      return <SiteTab s={s} />
    case 'home':
      return <HomeTab s={s} />
    case 'about':
      return <AboutTab s={s} />
    default:
      return <SlidesTab s={s} tab={tab === 'articles' || tab === 'ann' ? tab : 'slides'} />
  }
}

async function SlidesTab({ s, tab }: { s: Session; tab: 'slides' | 'articles' | 'ann' }) {
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

async function SiteTab({ s }: { s: Session }) {
  const [th, en, library] = await Promise.all([
    s.payload.findGlobal({ slug: 'site-settings', ...loc('th'), ...s.as }),
    s.payload.findGlobal({ slug: 'site-settings', ...loc('en'), ...s.as }),
    mediaLibrary(s),
  ])
  const c = th.contact ?? {}
  const p = (a?: string | null, b?: string | null) => ({ th: a ?? '', en: b ?? '' })
  return (
    <SiteInfoForm
      lang={s.lang}
      library={library}
      value={{
        siteName: p(th.siteName, en.siteName),
        logo: relId(th.logo),
        favicon: relId(th.favicon),
        contact: {
          phone: c.phone ?? '',
          lineId: c.lineId ?? '',
          lineUrl: c.lineUrl ?? '',
          email: c.email ?? '',
          whatsappUrl: c.whatsappUrl ?? '',
          facebookUrl: c.facebookUrl ?? '',
          instagramUrl: c.instagramUrl ?? '',
          tiktokUrl: c.tiktokUrl ?? '',
          youtubeUrl: c.youtubeUrl ?? '',
          hours: p(c.hours, en.contact?.hours),
          address: p(c.address, en.contact?.address),
        },
        hero: {
          title: p(th.hero?.title, en.hero?.title),
          subtitle: p(th.hero?.subtitle, en.hero?.subtitle),
          background: relId(th.hero?.background),
        },
        footerNote: p(th.footerNote, en.footerNote),
        analyticsId: th.analyticsId ?? '',
      }}
    />
  )
}

async function HomeTab({ s }: { s: Session }) {
  const [th, en] = await Promise.all([
    s.payload.findGlobal({ slug: 'home-sections', ...loc('th'), ...s.as }),
    s.payload.findGlobal({ slug: 'home-sections', ...loc('en'), ...s.as }),
  ])
  const enRows = new Map((en.services ?? []).map((r) => [r.id, r]))
  return (
    <HomeSectionsForm
      lang={s.lang}
      value={{
        services: (th.services ?? []).map((r) => {
          const e = r.id ? enRows.get(r.id) : undefined
          return {
            id: r.id ?? null,
            icon: SERVICE_ICON_KEYS.find((k) => k === r.icon) ?? 'mask',
            title: { th: r.title ?? '', en: e?.title ?? '' },
            text: { th: r.text ?? '', en: e?.text ?? '' },
          }
        }),
        showTrips: th.showTrips !== false,
        showCourses: th.showCourses !== false,
        showNews: th.showNews !== false,
        showFaq: th.showFaq !== false,
      }}
    />
  )
}

async function AboutTab({ s }: { s: Session }) {
  const [th, en, library] = await Promise.all([
    s.payload.findGlobal({ slug: 'about-page', ...loc('th'), ...s.as }),
    s.payload.findGlobal({ slug: 'about-page', ...loc('en'), ...s.as }),
    mediaLibrary(s),
  ])
  const bth = lexicalToBlocks(th.content)
  const ben = lexicalToBlocks(en.content)
  const enRows = new Map((en.stats ?? []).map((r) => [r.id, r]))
  return (
    <AboutEditor
      lang={s.lang}
      library={library}
      lossy={{ th: bth.lossy, en: ben.lossy }}
      value={{
        title: { th: th.title ?? '', en: en.title ?? '' },
        intro: { th: th.intro ?? '', en: en.intro ?? '' },
        image: relId(th.image),
        stats: (th.stats ?? []).map((r) => ({
          id: r.id ?? null,
          value: r.value ?? '',
          label: { th: r.label ?? '', en: (r.id ? enRows.get(r.id)?.label : '') ?? '' },
        })),
        content: {
          th: bth.blocks.length ? bth.blocks : [newBlock('p')],
          en: ben.blocks.length ? ben.blocks : [newBlock('p')],
        },
        contentDirty: { th: false, en: false },
        seoTitle: { th: th.seo?.title ?? '', en: en.seo?.title ?? '' },
        seoDescription: { th: th.seo?.description ?? '', en: en.seo?.description ?? '' },
        seoImage: relId(th.seo?.image),
      }}
    />
  )
}
