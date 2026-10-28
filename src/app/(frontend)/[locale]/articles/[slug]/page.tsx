import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { isLocale } from '@/i18n/config'
import { getPost, getSite, listCourses, mediaOf, relatedPosts } from '@/lib/content'
import { PostCard } from '@/site/components/cards'
import { featuredCourse, longDate, readingMinutes } from '@/site/format'
import { getDict } from '@/site/i18n'
import { headingsOf, plainText, RichText } from '@/site/RichText'
import { absUrl, jsonLd, pageMeta } from '@/site/seo'

type Props = { params: Promise<{ locale: string; slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  if (!isLocale(locale)) return {}
  const post = await getPost(locale, slug)
  if (!post) return {}
  return pageMeta({
    locale,
    path: `/articles/${post.slug}`,
    title: post.title,
    description: post.excerpt,
    seo: post.seo,
    image: post.cover,
    type: 'article',
    publishedTime: post.publishedAt,
  })
}

export default async function ArticlePage({ params }: Props) {
  const { locale, slug } = await params
  if (!isLocale(locale)) notFound()
  const [post, site, courses] = await Promise.all([getPost(locale, slug), getSite(locale), listCourses(locale)])
  if (!post) notFound()
  const t = getDict(locale)
  const related = await relatedPosts(locale, post)
  const cover = mediaOf(post.cover)
  const toc = headingsOf(post.content)
  const mins = readingMinutes(`${post.excerpt ?? ''}\n${plainText(post.content)}`, locale)
  const ow = featuredCourse(courses)
  const siteName = site?.settings.siteName || 'Dive Potato Scuba Diving'

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.seo?.title || post.title,
    description: post.seo?.description || post.excerpt || undefined,
    image: cover?.url ? [absUrl(cover.url)] : undefined,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    inLanguage: locale,
    mainEntityOfPage: absUrl(`/${locale}/articles/${post.slug}`),
    author: { '@type': 'Organization', name: siteName },
    publisher: {
      '@type': 'Organization',
      name: siteName,
      logo: { '@type': 'ImageObject', url: absUrl(mediaOf(site?.settings.logo)?.url ?? '/site/logo.webp') },
    },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />
      <article>
        <header className="pi">
          <div className="w art-h">
            <ol className="crumbs" style={{ justifyContent: 'center' }}>
              <li>
                <Link href={`/${locale}`}>{t.common.home}</Link>
              </li>
              <li>
                <Link href={`/${locale}/articles`}>{t.nav.articles}</Link>
              </li>
              <li>
                <Link href={`/${locale}/articles?cat=${post.category}`}>{t.blog.category[post.category]}</Link>
              </li>
            </ol>
            <h1 className="dsp">{post.title}</h1>
            {post.excerpt && <p className="x">{post.excerpt}</p>}
            <p className="m">
              <time dateTime={post.publishedAt}>{longDate(locale, post.publishedAt)}</time> · {t.common.minRead(mins)}
            </p>
          </div>
          {cover && (
            <div className="w">
              <div className="cover">
                <Image src={cover.url!} alt={cover.alt ?? ''} fill priority sizes="(max-width: 1240px) 100vw, 1200px" style={{ objectFit: 'cover' }} />
              </div>
            </div>
          )}
        </header>

        <section className="sec tight">
          <div className="w">
            <div className="art">
              <aside>
                {toc.length > 0 && (
                  <nav className="toc" aria-label={t.blog.toc}>
                    <b>{t.blog.toc}</b>
                    <ul>
                      {toc.map((h) => (
                        <li key={h.id} className={h.level === 3 ? 'l3' : undefined}>
                          <a href={`#${h.id}`}>{h.text}</a>
                        </li>
                      ))}
                    </ul>
                  </nav>
                )}
              </aside>
              <div>
                <RichText data={post.content} />
                <div className="cta">
                  <h2>{t.blog.ctaT}</h2>
                  <p>{t.blog.ctaP}</p>
                  <div className="act">
                    {ow && (
                      <Link className="pill y" href={`/${locale}/courses/${ow.slug}#schedule`}>
                        {t.blog.ctaCourse}
                      </Link>
                    )}
                    <Link className="pill wh" href={`/${locale}/trips#schedule`}>
                      {t.blog.ctaTrips}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </article>

      {related.length > 0 && (
        <section className="sec gry">
          <div className="w">
            <div className="th">
              <h2 className="h3">{t.blog.related}</h2>
              <Link className="more" href={`/${locale}/articles`}>
                {t.blog.backAll}
              </Link>
            </div>
            <div className="ag">
              {related.map((p) => (
                <PostCard key={p.id} locale={locale} post={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  )
}
