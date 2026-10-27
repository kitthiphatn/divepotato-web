import type { Access, CollectionConfig } from 'payload'

import { adminField, adminOnly, isAdmin } from '../access/roles'
import { GROUPS } from './groups'

// Admins manage everyone; other roles only see and edit their own account
const adminOrSelf: Access = ({ req: { user } }) => {
  if (!user) return false
  if (isAdmin(user)) return true
  return { id: { equals: user.id } }
}

export const Users: CollectionConfig = {
  slug: 'users',
  labels: {
    singular: { th: 'ผู้ใช้', en: 'User' },
    plural: { th: 'ผู้ใช้', en: 'Users' },
  },
  admin: {
    useAsTitle: 'email',
    group: GROUPS.system,
    defaultColumns: ['email', 'name', 'role'],
  },
  auth: true,
  access: {
    read: adminOrSelf,
    create: adminOnly,
    update: adminOrSelf,
    delete: adminOnly,
  },
  hooks: {
    beforeChange: [
      // The account made on the first-run screen is the shop owner, so it is always an admin
      async ({ data, operation, req }) => {
        if (operation !== 'create') return data
        const { totalDocs } = await req.payload.count({ collection: 'users', req })
        return totalDocs === 0 ? { ...data, role: 'admin' } : data
      },
    ],
  },
  fields: [
    {
      name: 'name',
      label: { th: 'ชื่อ', en: 'Name' },
      type: 'text',
    },
    {
      name: 'role',
      label: { th: 'สิทธิ์', en: 'Role' },
      type: 'select',
      required: true,
      defaultValue: 'editor',
      options: [
        { label: { th: 'ผู้ดูแลระบบ', en: 'Admin' }, value: 'admin' },
        { label: { th: 'ผู้แก้ไขเนื้อหา', en: 'Editor' }, value: 'editor' },
        { label: { th: 'พนักงานหน้าร้าน', en: 'Staff' }, value: 'staff' },
        { label: { th: 'ไกด์/ครูสอนดำน้ำ', en: 'Guide' }, value: 'guide' },
      ],
      admin: {
        description: {
          th: 'ผู้ดูแลระบบ: ทุกอย่าง · ผู้แก้ไขเนื้อหา: เนื้อหาเว็บ ทริป คอร์ส · พนักงาน: ดู/แก้การจอง ลูกค้า และรอบออกเดินทาง · ไกด์: ดูรอบออกเดินทางและการจองเพื่อใช้ใบรายชื่อเท่านั้น',
          en: 'Admin: everything · Editor: website content, trips, courses · Staff: view/update bookings, customers and departures · Guide: view departures and bookings for manifests only',
        },
      },
      access: {
        // Only admins can give or change a role
        create: adminField,
        update: adminField,
      },
    },
  ],
}
