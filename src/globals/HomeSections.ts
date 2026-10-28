import type { GlobalConfig } from 'payload'

import { contentTeam, hiddenFromGuide } from '../access/roles'
import { GROUPS } from '../collections/groups'
import { revalidateSite } from '../lib/revalidate'

export const SERVICE_ICONS = ['mask', 'boat', 'certificate', 'shield', 'globe', 'shop'] as const

export const HomeSections: GlobalConfig = {
  slug: 'home-sections',
  label: { th: 'เนื้อหาหน้าแรก', en: 'Homepage sections' },
  admin: { group: GROUPS.settings, hidden: hiddenFromGuide },
  access: { read: () => true, update: contentTeam },
  hooks: { afterChange: [revalidateSite] },
  fields: [
    {
      name: 'heroSlides',
      label: { th: 'สไลด์หน้าแรก', en: 'Home hero slides' },
      type: 'array',
      maxRows: 8,
      labels: {
        singular: { th: 'สไลด์', en: 'Slide' },
        plural: { th: 'สไลด์หน้าแรก', en: 'Home hero slides' },
      },
      admin: {
        description: {
          th: 'รูปใหญ่ด้านบนของหน้าแรก เลื่อนเปลี่ยนเองตามลำดับ แก้ไขได้ที่หลังบ้าน /backoffice',
          en: 'The large photos at the top of the home page, shown in order. Also editable in /backoffice.',
        },
      },
      fields: [
        {
          name: 'image',
          label: { th: 'รูปภาพ', en: 'Photo' },
          type: 'upload',
          relationTo: 'media',
        },
        {
          name: 'title',
          label: { th: 'หัวข้อ', en: 'Title' },
          type: 'text',
          required: true,
          localized: true,
        },
        {
          name: 'subtitle',
          label: { th: 'ข้อความรอง', en: 'Subtitle' },
          type: 'text',
          localized: true,
        },
        {
          type: 'row',
          fields: [
            {
              name: 'buttonLabel',
              label: { th: 'ข้อความบนปุ่ม', en: 'Button text' },
              type: 'text',
              localized: true,
            },
            {
              name: 'buttonLink',
              label: { th: 'ลิงก์ปุ่ม', en: 'Button link' },
              type: 'text',
            },
          ],
        },
      ],
    },
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
