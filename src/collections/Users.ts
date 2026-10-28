import type { Access, CollectionConfig, TextFieldSingleValidation } from 'payload'

import { adminField, adminOnly, isAdmin } from '../access/roles'
import { isValidUsername, USERNAME_MAX } from '../lib/username'
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
    defaultColumns: ['email', 'username', 'name', 'role'],
  },
  auth: {
    // Staff sign in with either their username or their email (here, /admin and /backoffice)
    loginWithUsername: {
      allowEmailLogin: true,
      requireEmail: true,
      // Nullable column, so accounts from before usernames keep working (with their email) and a
      // dev database can add the column without a data-loss prompt. New accounts must have one
      // (see the field's validate below); the migration gives existing accounts one.
      requireUsername: false,
    },
  },
  access: {
    // Only admins may open the Payload admin panel (/admin); the team works in /backoffice.
    // Payload sends anyone else to /admin/unauthorized, which src/proxy.ts redirects to
    // /backoffice. This only gates the panel: the REST/Local API keep the rules below.
    admin: ({ req: { user } }) => isAdmin(user),
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
    // Merged into Payload's built-in username auth field (which already trims, lowercases and
    // keeps it unique); adds the allowed characters, labels and admin-only changes
    {
      name: 'username',
      type: 'text',
      label: { th: 'ชื่อผู้ใช้', en: 'Username' },
      admin: {
        description: {
          th: `ใช้เข้าสู่ระบบแทนอีเมลได้ ตัวอักษรภาษาอังกฤษพิมพ์เล็ก ตัวเลข และ . _ - เท่านั้น (ไม่เกิน ${USERNAME_MAX} ตัว)`,
          en: `Can be used to sign in instead of the email. Lowercase a-z, 0-9 and . _ - only (up to ${USERNAME_MAX} characters)`,
        },
      },
      validate: ((value, { operation, req }) => {
        if (!value) return operation === 'create' ? req.t('validation:required') : true
        if (isValidUsername(value)) return true
        return req.i18n?.language === 'en'
          ? `Use lowercase a-z, 0-9 and . _ - only (up to ${USERNAME_MAX} characters)`
          : `ใช้ได้เฉพาะ a-z พิมพ์เล็ก ตัวเลข และ . _ - (ไม่เกิน ${USERNAME_MAX} ตัว)`
      }) satisfies TextFieldSingleValidation,
      access: {
        // Only admins can rename an account (the first-run account sets its own on create)
        update: adminField,
      },
    },
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
          th: 'ผู้ดูแลระบบ: ทุกอย่าง · ผู้แก้ไขเนื้อหา: เนื้อหาเว็บ ทริป คอร์ส · พนักงาน: รับจอง ตรวจสลิป รับชำระเงิน ดูแลลูกค้าและรอบออกเดินทาง · ไกด์: ดูรอบออกเดินทางและการจองเพื่อใช้ใบรายชื่อเท่านั้น',
          en: 'Admin: everything · Editor: website content, trips, courses · Staff: take bookings, review slips, record payments, look after customers and departures · Guide: view departures and bookings for manifests only',
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
