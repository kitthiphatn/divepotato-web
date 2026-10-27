import type { CollectionConfig } from 'payload'

import { contentTeam, hiddenFromGuide } from '../access/roles'
import { auditAfterChange, auditAfterDelete } from '../hooks/audit'
import { revalidateDeleted, revalidateDoc } from '../lib/revalidate'
import { GROUPS } from './groups'
import {
  galleryField,
  lineListField,
  priceField,
  publishedOrStaff,
  seoField,
  slugField,
} from './shared'

export const TRIP_TYPES = ['daytrip', 'liveaboard', 'overseas'] as const

export const LEVEL_OPTIONS = [
  { label: { th: 'ไม่ต้องมีบัตร', en: 'No certification' }, value: 'none' },
  { label: 'Open Water', value: 'ow' },
  { label: 'Advanced Open Water', value: 'aow' },
  { label: 'Rescue Diver', value: 'rescue' },
  { label: 'Divemaster', value: 'dm' },
]

export const Trips: CollectionConfig = {
  slug: 'trips',
  labels: {
    singular: { th: 'ทริปดำน้ำ', en: 'Trip' },
    plural: { th: 'ทริปดำน้ำ', en: 'Trips' },
  },
  admin: {
    useAsTitle: 'title',
    group: GROUPS.catalog,
    hidden: hiddenFromGuide,
    defaultColumns: ['title', 'type', 'price', '_status'],
  },
  access: {
    read: publishedOrStaff,
    create: contentTeam,
    update: contentTeam,
    delete: contentTeam,
  },
  versions: { drafts: true },
  hooks: {
    afterChange: [revalidateDoc, auditAfterChange],
    afterDelete: [revalidateDeleted, auditAfterDelete],
  },
  fields: [
    {
      name: 'title',
      label: { th: 'ชื่อทริป', en: 'Title' },
      type: 'text',
      required: true,
      localized: true,
    },
    slugField,
    {
      name: 'type',
      label: { th: 'ประเภททริป', en: 'Trip type' },
      type: 'select',
      required: true,
      defaultValue: 'daytrip',
      admin: { position: 'sidebar' },
      options: [
        { label: { th: 'ทริปไปเช้าเย็นกลับ', en: 'Day trip' }, value: 'daytrip' },
        { label: { th: 'ทริปค้างเรือ (Liveaboard)', en: 'Liveaboard' }, value: 'liveaboard' },
        { label: { th: 'ทริปต่างประเทศ', en: 'Overseas' }, value: 'overseas' },
      ],
    },
    {
      name: 'levelRequired',
      label: { th: 'ระดับบัตรขั้นต่ำ', en: 'Level required' },
      type: 'select',
      defaultValue: 'ow',
      options: LEVEL_OPTIONS,
      admin: { position: 'sidebar' },
    },
    {
      type: 'row',
      fields: [
        priceField('price', { th: 'ราคาต่อคน (บาท)', en: 'Price per person (THB)' }),
        {
          name: 'depositPct',
          label: { th: 'มัดจำ % (ถ้าต่างจากค่าเริ่มต้น)', en: 'Deposit % (override)' },
          type: 'number',
          min: 0,
          max: 100,
          admin: {
            description: {
              th: 'เว้นว่างเพื่อใช้ค่าในตั้งค่าการจอง',
              en: 'Leave empty to use the value in Booking settings',
            },
          },
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
    {
      name: 'itinerary',
      label: { th: 'กำหนดการ', en: 'Itinerary' },
      type: 'array',
      labels: {
        singular: { th: 'วัน', en: 'Day' },
        plural: { th: 'กำหนดการ', en: 'Itinerary' },
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'day',
              label: { th: 'วันที่', en: 'Day' },
              type: 'number',
              min: 1,
              required: true,
              admin: { width: '15%' },
            },
            {
              name: 'title',
              label: { th: 'หัวข้อ', en: 'Title' },
              type: 'text',
              localized: true,
              required: true,
            },
          ],
        },
        {
          name: 'text',
          label: { th: 'รายละเอียด', en: 'Details' },
          type: 'textarea',
          localized: true,
        },
      ],
    },
    lineListField('includes', { th: 'ราคานี้รวม', en: 'Includes' }),
    lineListField('excludes', { th: 'ราคานี้ไม่รวม', en: 'Excludes' }),
    {
      name: 'diveSites',
      label: { th: 'จุดดำน้ำ', en: 'Dive sites' },
      type: 'relationship',
      relationTo: 'dive-sites',
      hasMany: true,
    },
    galleryField,
    seoField,
  ],
}
