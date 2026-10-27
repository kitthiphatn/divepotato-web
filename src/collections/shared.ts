import type { Access, CollectionConfig, Field } from 'payload'

import { revalidateDeleted, revalidateDoc } from '../lib/revalidate'

export const contentHooks: CollectionConfig['hooks'] = {
  afterChange: [revalidateDoc],
  afterDelete: [revalidateDeleted],
}

// Visitors see published documents only; signed-in staff also see drafts
export const publishedOrStaff: Access = ({ req }) =>
  req.user ? true : { _status: { equals: 'published' } }

export const slugField: Field = {
  name: 'slug',
  label: { th: 'ชื่อในลิงก์ (slug)', en: 'URL slug' },
  type: 'text',
  required: true,
  unique: true,
  index: true,
  admin: {
    position: 'sidebar',
    description: {
      th: 'ภาษาอังกฤษตัวเล็ก ตัวเลข และขีด เช่น similan-liveaboard-4d3n',
      en: 'Lowercase letters, numbers and dashes, e.g. similan-liveaboard-4d3n',
    },
  },
  validate: (value: unknown) =>
    typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
      ? true
      : 'ใช้ได้เฉพาะ a-z, 0-9 และ - (Use a-z, 0-9 and - only)',
}

export const seoField: Field = {
  name: 'seo',
  label: 'SEO',
  type: 'group',
  admin: {
    description: {
      th: 'เว้นว่างได้ ระบบจะใช้หัวข้อและคำโปรยแทน',
      en: 'Optional; the title and summary are used when empty.',
    },
  },
  fields: [
    {
      name: 'title',
      label: { th: 'หัวข้อบน Google', en: 'Search title' },
      type: 'text',
      localized: true,
      maxLength: 70,
    },
    {
      name: 'description',
      label: { th: 'คำอธิบายบน Google', en: 'Search description' },
      type: 'textarea',
      localized: true,
      maxLength: 170,
    },
    {
      name: 'image',
      label: { th: 'รูปตอนแชร์ (1200×630)', en: 'Share image (1200×630)' },
      type: 'upload',
      relationTo: 'media',
    },
  ],
}

export const galleryField: Field = {
  name: 'gallery',
  label: { th: 'แกลเลอรีรูป', en: 'Gallery' },
  type: 'upload',
  relationTo: 'media',
  hasMany: true,
}

// A localized list of short lines (what's included, prerequisites, ...)
export const lineListField = (name: string, label: { th: string; en: string }): Field => ({
  name,
  label,
  type: 'array',
  localized: true,
  labels: {
    singular: { th: 'รายการ', en: 'Item' },
    plural: { th: 'รายการ', en: 'Items' },
  },
  fields: [{ name: 'text', label: { th: 'ข้อความ', en: 'Text' }, type: 'text', required: true }],
})

export const priceField = (
  name = 'price',
  label = { th: 'ราคา (บาท)', en: 'Price (THB)' },
): Field => ({
  name,
  label,
  type: 'number',
  min: 0,
  required: true,
  admin: { step: 100 },
})
