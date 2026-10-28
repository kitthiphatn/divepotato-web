import type { CollectionConfig } from 'payload'

import { contentTeam, hiddenFromGuide } from '../access/roles'
import { GROUPS } from './groups'
import { contentHooks, slugField } from './shared'

// Minimal catalogue for the gear shop; ordering and stock handling come in P4
export const Products: CollectionConfig = {
  slug: 'products',
  labels: {
    singular: { th: 'สินค้า', en: 'Product' },
    plural: { th: 'สินค้า', en: 'Products' },
  },
  admin: {
    useAsTitle: 'title',
    group: GROUPS.shop,
    hidden: hiddenFromGuide,
    defaultColumns: ['title', 'brand', 'category'],
  },
  access: { read: () => true, create: contentTeam, update: contentTeam, delete: contentTeam },
  hooks: contentHooks,
  fields: [
    {
      name: 'title',
      label: { th: 'ชื่อสินค้า', en: 'Title' },
      type: 'text',
      required: true,
      localized: true,
    },
    slugField,
    {
      type: 'row',
      fields: [
        { name: 'brand', label: { th: 'แบรนด์', en: 'Brand' }, type: 'text' },
        {
          name: 'category',
          label: { th: 'หมวด', en: 'Category' },
          type: 'select',
          options: [
            { label: { th: 'หน้ากาก', en: 'Masks' }, value: 'mask' },
            { label: { th: 'ฟิน', en: 'Fins' }, value: 'fins' },
            { label: { th: 'เว็ทสูท', en: 'Wetsuits' }, value: 'wetsuit' },
            { label: { th: 'ไดฟ์คอมพิวเตอร์', en: 'Dive computers' }, value: 'computer' },
            { label: { th: 'อุปกรณ์เสริม', en: 'Accessories' }, value: 'accessory' },
          ],
        },
      ],
    },
    {
      name: 'description',
      label: { th: 'รายละเอียด', en: 'Description' },
      type: 'textarea',
      localized: true,
    },
    {
      name: 'images',
      label: { th: 'รูปสินค้า', en: 'Images' },
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
    },
    {
      name: 'variants',
      label: { th: 'ตัวเลือก (ไซซ์)', en: 'Variants' },
      type: 'join',
      collection: 'product-variants',
      on: 'product',
    },
  ],
}
