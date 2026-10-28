import type { Role } from '@/access/roles'

export const BO = '/backoffice'

export type NavKey =
  'today' | 'bookings' | 'departures' | 'customers' | 'trips' | 'website' | 'shop' | 'settings'

export type NavItem = {
  key: NavKey
  href: string
  icon: string
  th: string
  en: string
  short?: readonly [string, string]
  group: 0 | 1 | 2
  roles: Role[]
}

// Left nav as in the prototype. Each item lists the roles whose access rules let them use it.
export const NAV: NavItem[] = [
  {
    key: 'today',
    href: BO,
    icon: 'today',
    th: 'วันนี้',
    en: 'Today',
    group: 0,
    roles: ['admin', 'staff', 'guide'],
  },
  {
    key: 'bookings',
    href: `${BO}/bookings`,
    icon: 'ticket',
    th: 'การจอง',
    en: 'Bookings',
    group: 0,
    roles: ['admin', 'staff'],
  },
  {
    key: 'departures',
    href: `${BO}/departures`,
    icon: 'cal',
    th: 'รอบออกเดินทาง',
    en: 'Departures',
    short: ['รอบเดินทาง', 'Departures'],
    group: 0,
    roles: ['admin', 'staff', 'guide'],
  },
  {
    key: 'customers',
    href: `${BO}/customers`,
    icon: 'users',
    th: 'ลูกค้า',
    en: 'Customers',
    group: 0,
    roles: ['admin', 'staff'],
  },
  {
    key: 'trips',
    href: `${BO}/trips`,
    icon: 'map',
    th: 'ทริปและคอร์ส',
    en: 'Trips & courses',
    short: ['ทริป/คอร์ส', 'Trips'],
    group: 1,
    roles: ['admin', 'editor'],
  },
  {
    key: 'website',
    href: `${BO}/website`,
    icon: 'globe',
    th: 'หน้าเว็บไซต์',
    en: 'Website',
    short: ['เว็บไซต์', 'Website'],
    group: 1,
    roles: ['admin', 'editor'],
  },
  {
    key: 'shop',
    href: `${BO}/shop`,
    icon: 'bag',
    th: 'ร้านค้า',
    en: 'Shop',
    group: 1,
    roles: ['admin', 'editor'],
  },
  {
    key: 'settings',
    href: `${BO}/settings`,
    icon: 'sliders',
    th: 'ตั้งค่า',
    en: 'Settings',
    group: 2,
    roles: ['admin'],
  },
]

// Tabs of the Website section (/backoffice/website?tab=...)
export const WEB_TABS = [
  'slides',
  'home',
  'articles',
  'ann',
  'popup',
  'about',
  'faq',
  'cookie',
  'site',
  'media',
] as const
export type WebTab = (typeof WEB_TABS)[number]

export const navFor = (role: Role) => NAV.filter((n) => n.roles.includes(role))

// Where a role lands after signing in (editors have no Today screen: they can't read bookings)
export const homeFor = (role: Role) => (role === 'editor' ? `${BO}/trips` : BO)

export function navKeyOf(pathname: string): NavKey {
  const seg = pathname.replace(/^\/backoffice\/?/, '').split('/')[0]
  return (NAV.find((n) => n.key === seg)?.key ?? 'today') as NavKey
}
