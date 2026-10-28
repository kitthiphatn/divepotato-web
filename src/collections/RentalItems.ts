import type { CollectionConfig } from 'payload'

import { anyUser, contentTeam, hiddenFromGuide } from '../access/roles'
import { GROUPS } from './groups'

export const RentalItems: CollectionConfig = {
  slug: 'rental-items',
  labels: {
    singular: { th: 'อุปกรณ์ให้เช่า', en: 'Rental item' },
    plural: { th: 'อุปกรณ์ให้เช่า', en: 'Rental items' },
  },
  admin: {
    useAsTitle: 'name',
    group: GROUPS.shop,
    hidden: hiddenFromGuide,
    defaultColumns: ['name', 'pricePerDay', 'stock'],
  },
  access: { read: anyUser, create: contentTeam, update: contentTeam, delete: contentTeam },
  fields: [
    {
      name: 'name',
      label: { th: 'ชื่ออุปกรณ์', en: 'Name' },
      type: 'text',
      required: true,
      localized: true,
    },
    {
      type: 'row',
      fields: [
        {
          name: 'pricePerDay',
          label: { th: 'ค่าเช่าต่อวัน (บาท)', en: 'Price per day (THB)' },
          type: 'number',
          required: true,
          min: 0,
        },
        {
          name: 'stock',
          label: { th: 'จำนวนในสต็อก', en: 'Stock' },
          type: 'number',
          required: true,
          min: 0,
          defaultValue: 0,
        },
      ],
    },
  ],
}
