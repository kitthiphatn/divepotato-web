import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { isLocale } from '@/i18n/config'
import { getSite, listPosts } from '@/lib/content'
import { PostCard } from '@/site/components/cards'
import { PageIntro } from '@/site/components/PageIntro'
import { getDict } from '@/site/i18n'
import { pageMeta } from '@/site/seo'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const CATS = ['news', 'promotion', 'travel', 'tips'] as const
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const t = getDict(locale)
  const [site, posts] = await Promise.all([getSite(locale), listPosts(locale, null, 1, 1)])
  return pageMeta({
    locale,
    path: '/articles',
    title: `${t.nav.articles} · ${t.blog.title}`,
    description: t.blog.lede,
    image: posts?.docs[0]?.cover ?? site?.settings.hero?.background,
  })
}

export default async function ArticlesPage({ params, searchParams }: Props) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const sp = await searchParams
  const t = getDict(locale)
  const cat = (CATS as readonly string[]).includes(one(sp.cat)) ? one(sp.cat) : ''
  const page = Math.max(1, Math.min(500, Math.floor(Number(one(sp.page)) || 1)))
  const posts = await listPosts(locale, cat || null, page)
  const href = (c: string, p = 1) => {
    const q = new URLSearchParams()
    if (c) q.set('cat', c)
    if (p > 1) q.set('page', String(p))
    const s = q.toString()
    return `/${locale}/articles${s ? `?${s}` : ''}`
  }
  const total = posts?.totalPages ?? 1

  return (
    <>
      <PageIntro locale={locale} eb={t.blog.eb} title={t.blog.title} lede={t.blog.lede} />
      <section className="sec tight">
        <div className="w">
          <nav className="chips c" aria-label={t.nav.articles} style={{ marginTop: 0 }}>
            <Link href={href('')} aria-current={!cat ? 'true' : undefined} scroll={false}>
              {t.common.all}
            </Link>
            {CATS.map((c) => (
              <Link key={c} href={href(c)} aria-current={cat === c ? 'true' : undefined} scroll={false}>
                {t.blog.category[c]}
              </Link>
            ))}
          </nav>
          {posts && posts.docs.length > 0 ? (
            <div className="ag bord">
              {posts.docs.map((p, i) => (
                <PostCard key={p.id} locale={locale} post={p} priority={i < 3} />
              ))}
            </div>
          ) : (
            <p className="empty">{t.common.empty}</p>
          )}
          {total > 1 && (
            <nav className="pager" aria-label={t.common.page}>
              {page > 1 && <Link href={href(cat, page - 1)}>‹</Link>}
              {Array.from({ length: total }, (_, i) => i + 1).map((n) =>
                n === page ? (
                  <span key={n} aria-current="page">
                    {n}
                  </span>
                ) : (
                  <Link key={n} href={href(cat, n)}>
                    {n}
                  </Link>
                ),
              )}
              {page < total && <Link href={href(cat, page + 1)}>›</Link>}
            </nav>
          )}
        </div>
      </section>
    </>
  )
}
