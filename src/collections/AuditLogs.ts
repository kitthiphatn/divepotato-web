import type { CollectionConfig } from 'payload'

import { adminOnly, nobody } from '../access/roles'
import { GROUPS } from './groups'

// Written only by the shared audit hook (src/hooks/audit.ts); read-only in the admin
export const AuditLogs: CollectionConfig = {
  slug: 'audit-logs',
  labels: {
    singular: { th: 'บันทึกการแก้ไข', en: 'Audit log' },
    plural: { th: 'บันทึกการแก้ไข', en: 'Audit logs' },
  },
  admin: {
    useAsTitle: 'summary',
    group: GROUPS.system,
    defaultColumns: ['createdAt', 'action', 'collectionSlug', 'docId', 'user'],
    disableCopyToLocale: true,
  },
  access: {
    read: adminOnly,
    create: nobody,
    update: nobody,
    delete: nobody,
  },
  defaultSort: '-createdAt',
  hooks: {
    beforeChange: [
      ({ data }) => ({ ...data, summary: `${data.action} ${data.collectionSlug} #${data.docId}` }),
    ],
  },
  fields: [
    {
      name: 'summary',
      type: 'text',
      admin: { hidden: true },
    },
    {
      name: 'action',
      label: { th: 'การกระทำ', en: 'Action' },
      type: 'select',
      required: true,
      options: [
        { label: { th: 'สร้าง', en: 'Create' }, value: 'create' },
        { label: { th: 'แก้ไข', en: 'Update' }, value: 'update' },
        { label: { th: 'ลบ', en: 'Delete' }, value: 'delete' },
      ],
      admin: { readOnly: true },
    },
    {
      name: 'collectionSlug',
      label: { th: 'ประเภทข้อมูล', en: 'Collection' },
      type: 'text',
      required: true,
      index: true,
      admin: { readOnly: true },
    },
    {
      name: 'docId',
      label: { th: 'รหัสเอกสาร', en: 'Document ID' },
      type: 'text',
      required: true,
      index: true,
      admin: { readOnly: true },
    },
    {
      name: 'user',
      label: { th: 'ผู้ใช้', en: 'User' },
      type: 'relationship',
      relationTo: 'users',
      admin: { readOnly: true },
    },
    {
      name: 'diff',
      label: { th: 'สิ่งที่เปลี่ยน', en: 'Changes' },
      type: 'json',
      admin: { readOnly: true },
    },
  ],
}
