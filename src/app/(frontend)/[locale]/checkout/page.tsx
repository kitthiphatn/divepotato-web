import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { isLocale } from '@/i18n/config'
import { Checkout } from '@/site/components/Checkout'
import { getDict } from '@/site/i18n'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  return { title: getDict(locale).checkout.title, robots: { index: false, follow: false } }
}

// /<locale>/checkout: details and delivery for the cart in the browser, then on to the pay page
export default async function CheckoutPage({ params }: Props) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  return (
    <section className="sec payp">
      <div className="w">
        <Checkout locale={locale} />
      </div>
    </section>
  )
}
