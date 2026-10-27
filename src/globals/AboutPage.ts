import type { GlobalConfig } from 'payload'

import { seoField } from '../collections/shared'
import { contentTeam } from '../access/roles'
import { GROUPS } from '../collections/groups'
import { revalidateSite } from '../lib/revalidate'

export const AboutPage: GlobalConfig = {
  slug: 'about-page',
  label: { th: 'หน้าเกี่ยวกับเรา', en: 'About page' },
  admin: { group: GROUPS.settings },
  access: { read: () => true, update: contentTeam },
  hooks: { afterChange: [revalidateSite] },
  fields: [
    {
      name: 'title',
      label: { th: 'หัวข้อ', en: 'Title' },
      type: 'text',
      localized: true,
    },
    {
      name: 'intro',
      label: { th: 'คำโปรย', en: 'Intro' },
      type: 'textarea',
      localized: true,
    },
    {
      name: 'image',
      label: { th: 'รูปหลัก (16:9)', en: 'Main image (16:9)' },
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'stats',
      label: { th: 'ตัวเลขเด่น', en: 'Key figures' },
      type: 'array',
      maxRows: 6,
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'value',
              label: { th: 'ตัวเลข', en: 'Value' },
              type: 'text',
              required: true,
              admin: { placeholder: '25+' },
            },
            {
              name: 'label',
              label: { th: 'คำอธิบาย', en: 'Label' },
              type: 'text',
              required: true,
              localized: true,
            },
          ],
        },
      ],
    },
    {
      name: 'content',
      label: { th: 'เนื้อหา', en: 'Content' },
      type: 'richText',
      localized: true,
    },
    seoField,
  ],
}
