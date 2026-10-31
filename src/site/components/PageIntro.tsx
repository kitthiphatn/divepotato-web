import Link from 'next/link'

import type { Locale } from '@/i18n/config'
import { getDict } from '@/site/i18n'

// Centered page title for list pages (no photo hero): breadcrumb, H1 and lede
export function PageIntro({
  locale,
  eb,
  title,
  lede,
}: {
  locale: Locale
  eb: string
  title: string
  lede?: string | null
}) {
  const t = getDict(locale)
  return (
    <section className="pi">
      <div className="w intro">
        <ol className="crumbs" style={{ justifyContent: 'center' }}>
          <li>
            <Link href={`/${locale}`}>{t.common.home}</Link>
          </li>
          <li>{eb}</li>
        </ol>
        <h1 className="dsp">{title}</h1>
        {lede && <p className="lede">{lede}</p>}
      </div>
    </section>
  )
}
