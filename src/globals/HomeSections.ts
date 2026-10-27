import type { GlobalConfig } from 'payload'

import { contentTeam } from '../access/roles'
import { GROUPS } from '../collections/groups'
import { revalidateSite } from '../lib/revalidate'

export const SERVICE_ICONS = ['mask', 'boat', 'certificate', 'shield', 'globe', 'shop'] as const

export const HomeSections: GlobalConfig = {
  slug: 'home-sections',
  label: { th: 'เนื้อหาหน้าแรก', en: 'Homepage sections' },
  admin: { group: GROUPS.settings },
  access: { read: () => true, update: contentTeam },
  hooks: { afterChange: [revalidateSite] },
  fields: [
    {
      name: 'services',
      label: { th: 'จุดเด่นของร้าน', en: 'Highlights' },
      type: 'array',
      maxRows: 6,
      labels: {
        singular: { th: 'จุดเด่น', en: 'Highlight' },
        plural: { th: 'จุดเด่น', en: 'Highlights' },
      },
      fields: [
        {
          name: 'icon',
          label: { th: 'ไอคอน', en: 'Icon' },
          type: 'select',
          defaultValue: 'mask',
          options: [
            { label: { th: 'หน้ากากดำน้ำ', en: 'Mask' }, value: 'mask' },
            { label: { th: 'เรือ', en: 'Boat' }, value: 'boat' },
            { label: { th: 'บัตร PADI', en: 'Certificate' }, value: 'certificate' },
            { label: { th: 'โล่ (ปลอดภัย)', en: 'Shield' }, value: 'shield' },
            { label: { th: 'ลูกโลก (ต่างประเทศ)', en: 'Globe' }, value: 'globe' },
            { label: { th: 'ร้านค้า', en: 'Shop' }, value: 'shop' },
          ],
        },
        {
          name: 'title',
          label: { th: 'หัวข้อ', en: 'Title' },
          type: 'text',
          required: true,
          localized: true,
        },
        {
          name: 'text',
          label: { th: 'คำอธิบาย', en: 'Description' },
          type: 'textarea',
          localized: true,
        },
      ],
    },
    {
      name: 'showTrips',
      label: { th: 'แสดงทริป', en: 'Show trips' },
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'showCourses',
      label: { th: 'แสดงคอร์สเรียน', en: 'Show courses' },
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'showNews',
      label: { th: 'แสดงบทความล่าสุด', en: 'Show latest posts' },
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'showFaq',
      label: { th: 'แสดงคำถามที่พบบ่อย', en: 'Show FAQs' },
      type: 'checkbox',
      defaultValue: true,
    },
  ],
}
