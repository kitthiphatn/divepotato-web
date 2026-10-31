// Shop labels and helpers shared by the stock grid, the product editor and the orders screen
import type { Role } from '@/access/roles'

import type { Tr } from './i18n'
import { BO } from './nav'

export const PRODUCT_CATEGORIES = ['mask', 'fins', 'wetsuit', 'computer', 'accessory'] as const
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number]

export const PRODUCT_CAT_LABEL: Record<ProductCategory, readonly [string, string]> = {
  mask: ['หน้ากาก', 'Mask'],
  fins: ['ฟิน', 'Fins'],
  wetsuit: ['เว็ทสูท', 'Wetsuit'],
  computer: ['ไดฟ์คอมพิวเตอร์', 'Dive computer'],
  accessory: ['อุปกรณ์เสริม', 'Accessory'],
}

export const PRODUCT_ICON: Record<string, string> = {
  mask: 'mask',
  fins: 'fin',
  wetsuit: 'suit',
  computer: 'watch',
  accessory: 'sparkle',
}

const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL']
export const sizeRank = (s: string) => {
  const i = SIZE_ORDER.indexOf(s.trim().split(/\s+/)[0].toUpperCase())
  return i < 0 ? 100 + (Number.parseFloat(s) || 0) : i
}

export const isOneSize = (s: string) => !s || /^(free|one)\s*size$/i.test(s)

// Sub-tabs of the Shop section for a role: orders for staff and admins, products and rentals
// for admins and editors
export function shopTabs(L: Tr, role: Role, on: 'orders' | 'products' | 'rentals') {
  const content = role === 'admin' || role === 'editor'
  const orders = role === 'admin' || role === 'staff'
  return [
    ...(orders
      ? [{ href: `${BO}/shop/orders`, label: L('คำสั่งซื้อ', 'Orders'), icon: 'ticket', on: on === 'orders' }]
      : []),
    ...(content
      ? [
          { href: `${BO}/shop`, label: L('สินค้า', 'Products'), icon: 'bag', on: on === 'products' },
          {
            href: `${BO}/shop/rentals`,
            label: L('อุปกรณ์ให้เช่า', 'Rental gear'),
            icon: 'suit',
            on: on === 'rentals',
          },
        ]
      : []),
  ]
}
