import type { CollectionConfig } from 'payload'

import { adminOnly, bookingEditors } from '../access/roles'
import { GROUPS } from './groups'

export const Customers: CollectionConfig = {
  slug: 'customers',
  labels: {
    singular: { th: 'ลูกค้า', en: 'Customer' },
    plural: { th: 'ลูกค้า', en: 'Customers' },
  },
  admin: {
    useAsTitle: 'name',
    group: GROUPS.bookings,
    defaultColumns: ['name', 'phone', 'email', 'nationality'],
    listSearchableFields: ['name', 'email', 'phone', 'lineId'],
  },
  access: { read: bookingEditors, update: bookingEditors, create: adminOnly, delete: adminOnly },
  fields: [
    { name: 'name', label: { th: 'ชื่อ-นามสกุล', en: 'Name' }, type: 'text', required: true },
    {
      type: 'row',
      fields: [
        { name: 'email', label: { th: 'อีเมล', en: 'Email' }, type: 'email' },
        { name: 'phone', label: { th: 'เบอร์โทร', en: 'Phone' }, type: 'text' },
        { name: 'lineId', label: 'LINE ID', type: 'text' },
      ],
    },
    { name: 'nationality', label: { th: 'สัญชาติ', en: 'Nationality' }, type: 'text' },
    { name: 'notes', label: { th: 'บันทึก', en: 'Notes' }, type: 'textarea' },
  ],
}
