// Option lists for the Website section, shared by its pages, client screens and server actions
// (a 'use server' file may only export async functions, a 'use client' one only client values)

// Home page highlight icons (HomeSections `services.icon`) and the backoffice icon shown for each
export const SERVICE_ICON_KEYS = ['mask', 'boat', 'certificate', 'shield', 'globe', 'shop'] as const
export type ServiceIcon = (typeof SERVICE_ICON_KEYS)[number]
export const SERVICE_ICON: Record<ServiceIcon, { icon: string; th: string; en: string }> = {
  mask: { icon: 'mask', th: 'หน้ากากดำน้ำ', en: 'Mask' },
  boat: { icon: 'boat', th: 'เรือ', en: 'Boat' },
  certificate: { icon: 'card', th: 'บัตร PADI', en: 'Certificate' },
  shield: { icon: 'shield', th: 'โล่ (ปลอดภัย)', en: 'Shield' },
  globe: { icon: 'globe', th: 'ลูกโลก (ต่างประเทศ)', en: 'Globe' },
  shop: { icon: 'bag', th: 'ร้านค้า', en: 'Shop' },
}

// FAQ categories (Faqs `category`)
export const FAQ_CATS = ['booking', 'courses', 'trips', 'general'] as const
export type FaqCat = (typeof FAQ_CATS)[number]
export const FAQ_CAT_LABEL: Record<FaqCat, readonly [string, string]> = {
  booking: ['การจองและชำระเงิน', 'Booking and payment'],
  courses: ['คอร์สเรียนดำน้ำ', 'Courses'],
  trips: ['ทริปดำน้ำ', 'Trips'],
  general: ['ทั่วไป', 'General'],
}
