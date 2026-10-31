import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { isLocale } from '@/i18n/config'
import { getSite, listProducts } from '@/lib/content'
import { ProductCard } from '@/site/components/cards'
import { PageIntro } from '@/site/components/PageIntro'
import { cleanContact } from '@/site/format'
import { getDict } from '@/site/i18n'
import { LineIcon } from '@/site/icons'
import { pageMeta } from '@/site/seo'

// Filters come from the query string, so this list is rendered per request
export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const t = getDict(locale)
  const [site, products] = await Promise.all([getSite(locale), listProducts(locale)])
  return pageMeta({
    locale,
    path: '/equipment',
    title: `${t.nav.equipment} · ${t.gear.title}`,
    description: t.gear.lede,
    image: products.find((p) => p.images?.length)?.images?.[0] ?? site?.settings.hero?.background,
  })
}

export default async function EquipmentPage({ params, searchParams }: Props) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const sp = await searchParams
  const t = getDict(locale)
  const [site, products] = await Promise.all([getSite(locale), listProducts(locale)])
  const cats = [...new Set(products.map((p) => p.category).filter((c): c is NonNullable<typeof c> => !!c))]
  const cat = cats.includes(one(sp.cat) as (typeof cats)[number]) ? one(sp.cat) : ''
  const shown = products.filter((p) => !cat || p.category === cat)
  const c = site?.settings.contact
  const lineUrl = c?.lineUrl && /^https?:\/\//i.test(c.lineUrl) ? c.lineUrl : null

  return (
    <>
      <PageIntro locale={locale} eb={t.gear.eb} title={t.gear.title} lede={t.gear.lede} />
      <section className="sec tight">
        <div className="w">
          {cats.length > 1 && (
            <nav className="chips c" aria-label={t.nav.equipment} style={{ marginTop: 0 }}>
              <Link href={`/${locale}/equipment`} aria-current={!cat ? 'true' : undefined} scroll={false}>
                {t.common.all}
              </Link>
              {cats.map((k) => (
                <Link key={k} href={`/${locale}/equipment?cat=${k}`} aria-current={cat === k ? 'true' : undefined} scroll={false}>
                  {t.gear.category[k]}
                </Link>
              ))}
            </nav>
          )}
          {shown.length > 0 ? (
            <div className="pg">
              {shown.map((p) => (
                <ProductCard key={p.id} locale={locale} product={p} />
              ))}
            </div>
          ) : (
            <p className="empty">{t.common.empty}</p>
          )}
          {lineUrl && (
            <div className="cta" style={{ textAlign: 'center' }}>
              <h2>{t.gear.orderLine}</h2>
              <p style={{ marginInline: 'auto' }}>{t.gear.lineHint(cleanContact(c?.lineId) || 'LINE')}</p>
              <div className="act" style={{ justifyContent: 'center' }}>
                <a className="pill y" href={lineUrl} target="_blank" rel="noopener noreferrer">
                  <LineIcon />
                  {t.gear.orderLine}
                </a>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
