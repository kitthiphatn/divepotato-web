import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { isLocale } from '@/i18n/config'
import { getProduct, getSite, mediaOf } from '@/lib/content'
import type { Media } from '@/payload-types'
import { cleanContact, money } from '@/site/format'
import { getDict } from '@/site/i18n'
import { GearIcon, LineIcon } from '@/site/icons'
import { absUrl, jsonLd, pageMeta } from '@/site/seo'

type Props = { params: Promise<{ locale: string; slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  if (!isLocale(locale)) return {}
  const product = await getProduct(locale, slug)
  if (!product) return {}
  return pageMeta({
    locale,
    path: `/equipment/${product.slug}`,
    title: product.title,
    description: product.description,
    image: product.images?.[0],
  })
}

// Product page. No cart or checkout until phase 4: orders go through LINE.
export default async function ProductPage({ params }: Props) {
  const { locale, slug } = await params
  if (!isLocale(locale)) notFound()
  const [product, site] = await Promise.all([getProduct(locale, slug), getSite(locale)])
  if (!product) notFound()
  const t = getDict(locale)
  const images = (product.images ?? []).map(mediaOf).filter((m): m is Media => Boolean(m?.url))
  const prices = product.sizes.map((v) => v.price ?? 0)
  const min = prices.length ? Math.min(...prices) : null
  const max = prices.length ? Math.max(...prices) : null
  const inStock = product.sizes.some((v) => (v.stock ?? 0) > 0)
  const c = site?.settings.contact
  const lineUrl = c?.lineUrl && /^https?:\/\//i.test(c.lineUrl) ? c.lineUrl : null
  const lineId = cleanContact(c?.lineId)

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description || undefined,
    brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
    image: images.map((m) => absUrl(m.url!)),
    sku: product.sizes[0]?.sku,
    offers: product.sizes.map((v) => ({
      '@type': 'Offer',
      sku: v.sku,
      name: v.size || undefined,
      price: v.price,
      priceCurrency: 'THB',
      availability: (v.stock ?? 0) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: absUrl(`/${locale}/equipment/${product.slug}`),
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />
      <section className="sec tight">
        <div className="w">
          <ol className="crumbs">
            <li>
              <Link href={`/${locale}`}>{t.common.home}</Link>
            </li>
            <li>
              <Link href={`/${locale}/equipment`}>{t.nav.equipment}</Link>
            </li>
            {product.category && (
              <li>
                <Link href={`/${locale}/equipment?cat=${product.category}`}>{t.gear.category[product.category]}</Link>
              </li>
            )}
          </ol>
          <div className="pdp">
            <div>
              <div className="pim">
                {images[0] ? (
                  <Image src={images[0].url!} alt={images[0].alt ?? ''} fill priority sizes="(max-width: 860px) 100vw, 640px" style={{ objectFit: 'cover' }} />
                ) : (
                  <>
                    <GearIcon category={product.category} />
                    <span className="dp-cap">{t.gear.photo}</span>
                  </>
                )}
              </div>
              {images.length > 1 && (
                <div className="thumbs">
                  {images.slice(1, 5).map((m) => (
                    <figure key={m.id}>
                      <Image src={m.url!} alt={m.alt ?? ''} fill sizes="160px" style={{ objectFit: 'cover' }} />
                    </figure>
                  ))}
                </div>
              )}
            </div>
            <div>
              <p className="c">
                {[product.brand, product.category ? t.gear.category[product.category] : null].filter(Boolean).join(' · ')}
              </p>
              <h1 className="dsp">{product.title}</h1>
              {min !== null && (
                <p className="price num">
                  {min === max ? money(min) : `${money(min)} – ${money(max)}`}
                </p>
              )}
              {product.description && <p className="desc">{product.description}</p>}
              {product.sizes.length > 0 && (
                <table className="vt">
                  <thead>
                    <tr>
                      <th scope="col">{t.gear.size}</th>
                      <th scope="col">{t.gear.sku}</th>
                      <th scope="col">{t.trips.price}</th>
                      <th scope="col">{t.gear.stock}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.sizes.map((v) => {
                      const ok = (v.stock ?? 0) > 0
                      return (
                        <tr key={v.id} className={ok ? undefined : 'out'}>
                          <td>{v.size || '–'}</td>
                          <td>{v.sku}</td>
                          <td className="num">{money(v.price)}</td>
                          <td className={ok ? 'ok' : undefined}>{ok ? t.gear.inStock : t.gear.outOfStock}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
              {lineUrl ? (
                <>
                  <a className="pill y" href={lineUrl} target="_blank" rel="noopener noreferrer">
                    <LineIcon />
                    {t.gear.orderLine}
                  </a>
                  <p className="hint">{t.gear.lineHint(lineId || 'LINE')}</p>
                </>
              ) : null}
              {!inStock && product.sizes.length > 0 && <p className="hint">{t.gear.outOfStock}</p>}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
