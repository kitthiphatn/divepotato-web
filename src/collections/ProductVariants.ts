import type { CollectionConfig } from 'payload'

import { contentTeam, hiddenFromGuide } from '../access/roles'
import { GROUPS } from './groups'
import { contentHooks } from './shared'

export const ProductVariants: CollectionConfig = {
  slug: 'product-variants',
  labels: {
    singular: { th: 'ตัวเลือกสินค้า', en: 'Product variant' },
    plural: { th: 'ตัวเลือกสินค้า (ไซซ์/สต็อก)', en: 'Product variants' },
  },
  admin: {
    useAsTitle: 'sku',
    group: GROUPS.shop,
    hidden: hiddenFromGuide,
    defaultColumns: ['sku', 'product', 'size', 'price', 'stock'],
  },
  access: { read: () => true, create: contentTeam, update: contentTeam, delete: contentTeam },
  // Sizes, prices and stock show on the public equipment pages
  hooks: contentHooks,
  fields: [
    {
      name: 'product',
      label: { th: 'สินค้า', en: 'Product' },
      type: 'relationship',
      relationTo: 'products',
      required: true,
      index: true,
    },
    {
      type: 'row',
      fields: [
        { name: 'sku', label: 'SKU', type: 'text', required: true, unique: true },
        { name: 'size', label: { th: 'ไซซ์', en: 'Size' }, type: 'text' },
        {
          name: 'price',
          label: { th: 'ราคา (บาท)', en: 'Price (THB)' },
          type: 'number',
          required: true,
          min: 0,
        },
        {
          name: 'stock',
          label: { th: 'สต็อก', en: 'Stock' },
          type: 'number',
          required: true,
          min: 0,
          defaultValue: 0,
        },
      ],
    },
  ],
}
