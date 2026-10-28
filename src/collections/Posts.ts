import type { CollectionConfig } from 'payload'

import { contentTeam, hiddenFromGuide } from '../access/roles'
import { GROUPS } from './groups'
import { contentHooks, publishedOrStaff, seoField, slugField } from './shared'

export const POST_CATEGORIES = ['news', 'promotion', 'travel', 'tips'] as const

export const Posts: CollectionConfig = {
  slug: 'posts',
  labels: {
    singular: { th: 'บทความ', en: 'Post' },
    plural: { th: 'บทความ/ข่าว', en: 'Posts' },
  },
  admin: {
    useAsTitle: 'title',
    group: GROUPS.content,
    hidden: hiddenFromGuide,
    defaultColumns: ['title', 'category', 'publishedAt', '_status'],
  },
  access: {
    read: publishedOrStaff,
    create: contentTeam,
    update: contentTeam,
    delete: contentTeam,
  },
  versions: { drafts: true },
  hooks: contentHooks,
  defaultSort: '-publishedAt',
  fields: [
    {
      name: 'title',
      label: { th: 'หัวข้อ', en: 'Title' },
      type: 'text',
      required: true,
      localized: true,
    },
    slugField,
    {
      name: 'publishedAt',
      label: { th: 'วันที่เผยแพร่', en: 'Publish date' },
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime' },
        description: {
          th: 'ตั้งเป็นวันในอนาคตได้ บทความจะขึ้นเว็บเองเมื่อถึงเวลา',
          en: 'Set a future date to schedule; the post appears on its own at that time.',
        },
      },
    },
    {
      name: 'category',
      label: { th: 'หมวด', en: 'Category' },
      type: 'select',
      required: true,
      defaultValue: 'news',
      admin: { position: 'sidebar' },
      options: [
        { label: { th: 'ข่าวสาร', en: 'News' }, value: 'news' },
        { label: { th: 'โปรโมชั่น', en: 'Promotion' }, value: 'promotion' },
        { label: { th: 'รีวิวทริป', en: 'Trip report' }, value: 'travel' },
        { label: { th: 'เกร็ดความรู้ดำน้ำ', en: 'Diving tips' }, value: 'tips' },
      ],
    },
    {
      name: 'cover',
      label: { th: 'รูปปก (16:9)', en: 'Cover image (16:9)' },
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'excerpt',
      label: { th: 'คำโปรย', en: 'Summary' },
      type: 'textarea',
      localized: true,
      maxLength: 240,
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
