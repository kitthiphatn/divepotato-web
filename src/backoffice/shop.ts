// Shop labels and helpers shared by the stock grid and the product editor
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
