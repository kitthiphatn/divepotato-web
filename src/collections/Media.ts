import type { CollectionConfig } from 'payload'

import { anyUser, contentTeam, hiddenFromGuide } from '../access/roles'
import { GROUPS } from './groups'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: {
    singular: { th: 'ไฟล์', en: 'Media' },
    plural: { th: 'คลังรูป', en: 'Media' },
  },
  admin: { group: GROUPS.content, hidden: hiddenFromGuide },
  access: {
    read: () => true,
    // Staff can upload payment slips, so any signed-in user may add files
    create: anyUser,
    update: anyUser,
    delete: contentTeam,
  },
  fields: [
    {
      name: 'alt',
      label: { th: 'คำอธิบายรูป', en: 'Alt text' },
      type: 'text',
      required: true,
      localized: true,
    },
  ],
  upload: {
    // Stored inside this site's folder (ignored by git; back it up with the database).
    // On the server MEDIA_DIR points outside the app folder, so a new release keeps uploads.
    staticDir: process.env.MEDIA_DIR || 'media',
  },
}
