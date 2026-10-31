import type { Locale } from '@/i18n/config'
import type { NavItem } from '@/site/components/Header'
import { getDict } from '@/site/i18n'

// The seven pages of the site map, in the design's order
export function navItems(locale: Locale): NavItem[] {
  const t = getDict(locale).nav
  const p = (s: string) => `/${locale}${s}`
  return [
    { key: 'home', href: p(''), label: t.home },
    { key: 'courses', href: p('/courses'), label: t.courses },
    { key: 'trips', href: p('/trips'), label: t.trips },
    { key: 'equipment', href: p('/equipment'), label: t.equipment },
    { key: 'about', href: p('/about'), label: t.about },
    { key: 'articles', href: p('/articles'), label: t.articles },
    { key: 'contact', href: p('/contact'), label: t.contact },
  ]
}
