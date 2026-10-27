import type { CollectionConfig } from 'payload'

import { contentTeam } from '../access/roles'
import { GROUPS } from './groups'
import {
  contentHooks,
  galleryField,
  lineListField,
  priceField,
  publishedOrStaff,
  seoField,
  slugField,
} from './shared'

export const Courses: CollectionConfig = {
  slug: 'courses',
  labels: {
    singular: { th: 'คอร์สเรียน', en: 'Course' },
    plural: { th: 'คอร์สเรียน PADI', en: 'Courses' },
  },
  admin: {
    useAsTitle: 'title',
    group: GROUPS.catalog,
    defaultColumns: ['title', 'padiCode', 'days', 'price', '_status'],
  },
  access: {
    read: publishedOrStaff,
    create: contentTeam,
    update: contentTeam,
    delete: contentTeam,
  },
  versions: { drafts: true },
  hooks: contentHooks,
  fields: [
    {
      name: 'title',
      label: { th: 'ชื่อคอร์ส', en: 'Title' },
      type: 'text',
      required: true,
      localized: true,
    },
    slugField,
    {
      name: 'padiCode',
      label: { th: 'รหัสคอร์ส PADI', en: 'PADI code' },
      type: 'text',
      admin: { position: 'sidebar', placeholder: 'OWD' },
    },
    {
      type: 'row',
      fields: [
        priceField('price', { th: 'ราคา (บาท)', en: 'Price (THB)' }),
        {
          name: 'days',
          label: { th: 'จำนวนวัน', en: 'Days' },
          type: 'number',
          min: 1,
          required: true,
        },
      ],
    },
    {
      name: 'summary',
      label: { th: 'คำโปรย', en: 'Summary' },
      type: 'textarea',
      localized: true,
      maxLength: 300,
    },
    {
      name: 'description',
      label: { th: 'รายละเอียด', en: 'Description' },
      type: 'richText',
      localized: true,
    },
    lineListField('prerequisites', { th: 'คุณสมบัติผู้เรียน', en: 'Prerequisites' }),
    lineListField('includes', { th: 'ราคานี้รวม', en: 'Includes' }),
    galleryField,
    seoField,
  ],
}
