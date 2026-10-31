import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { isLocale } from '@/i18n/config'
import { CartView } from '@/site/components/CartView'
import { getDict } from '@/site/i18n'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  return { title: getDict(locale).cart.title, robots: { index: false, follow: false } }
}

// /<locale>/cart: the cart lives in the browser, so the page is a shell around CartView
export default async function CartPage({ params }: Props) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const c = getDict(locale).cart
  return (
    <section className="sec payp">
      <div className="w cartp">
        <div className="payh">
          <span className="eb">{c.eb}</span>
          <h1 className="dsp">{c.title}</h1>
        </div>
        <CartView locale={locale} />
      </div>
    </section>
  )
}
