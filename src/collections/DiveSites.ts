import type { CollectionConfig } from 'payload'

import { contentTeam, hiddenFromGuide } from '../access/roles'
import { GROUPS } from './groups'
import { contentHooks } from './shared'

export const DiveSites: CollectionConfig = {
  slug: 'dive-sites',
  labels: {
    singular: { th: 'จุดดำน้ำ', en: 'Dive site' },
    plural: { th: 'จุดดำน้ำ', en: 'Dive sites' },
  },
  admin: {
    useAsTitle: 'name',
    group: GROUPS.catalog,
    hidden: hiddenFromGuide,
    defaultColumns: ['name', 'region'],
  },
  access: { read: () => true, create: contentTeam, update: contentTeam, delete: contentTeam },
  hooks: contentHooks,
  fields: [
    {
      name: 'name',
      label: { th: 'ชื่อจุดดำน้ำ', en: 'Name' },
      type: 'text',
      required: true,
      localized: true,
    },
    {
      name: 'region',
      label: { th: 'ภูมิภาค/ทะเล', en: 'Region' },
      type: 'text',
      localized: true,
      admin: { placeholder: 'Similan / Andaman' },
    },
    {
      name: 'description',
      label: { th: 'รายละเอียด', en: 'Description' },
      type: 'textarea',
      localized: true,
    },
    {
      name: 'image',
      label: { th: 'รูป', en: 'Image' },
      type: 'upload',
      relationTo: 'media',
    },
  ],
}
