import type { CollectionConfig } from 'payload'

import { contentTeam, hiddenFromGuide } from '../access/roles'
import { GROUPS } from './groups'
import { contentHooks } from './shared'

export const FAQ_CATEGORIES = ['booking', 'courses', 'trips', 'general'] as const

export const Faqs: CollectionConfig = {
  slug: 'faqs',
  labels: {
    singular: { th: 'คำถามที่พบบ่อย', en: 'FAQ' },
    plural: { th: 'คำถามที่พบบ่อย', en: 'FAQs' },
  },
  admin: {
    useAsTitle: 'question',
    group: GROUPS.content,
    hidden: hiddenFromGuide,
    defaultColumns: ['question', 'category', 'showOnHome', 'order'],
  },
  access: { read: () => true, create: contentTeam, update: contentTeam, delete: contentTeam },
  hooks: contentHooks,
  defaultSort: 'order',
  fields: [
    {
      name: 'question',
      label: { th: 'คำถาม', en: 'Question' },
      type: 'text',
      required: true,
      localized: true,
    },
    {
      name: 'answer',
      label: { th: 'คำตอบ', en: 'Answer' },
      type: 'textarea',
      required: true,
      localized: true,
    },
    {
      name: 'category',
      label: { th: 'หมวด', en: 'Category' },
      type: 'select',
      required: true,
      defaultValue: 'general',
      admin: { position: 'sidebar' },
      options: [
        { label: { th: 'การจองและชำระเงิน', en: 'Booking and payment' }, value: 'booking' },
        { label: { th: 'คอร์สเรียนดำน้ำ', en: 'Courses' }, value: 'courses' },
        { label: { th: 'ทริปดำน้ำ', en: 'Trips' }, value: 'trips' },
        { label: { th: 'ทั่วไป', en: 'General' }, value: 'general' },
      ],
    },
    {
      name: 'showOnHome',
      label: { th: 'แสดงในหน้าแรก', en: 'Show on homepage' },
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar' },
    },
    {
      name: 'order',
      label: { th: 'ลำดับ', en: 'Order' },
      type: 'number',
      defaultValue: 10,
      admin: {
        position: 'sidebar',
        description: { th: 'เลขน้อยขึ้นก่อน', en: 'Lower numbers come first' },
      },
    },
  ],
}
