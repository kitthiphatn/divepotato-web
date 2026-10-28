import type { CollectionConfig } from 'payload'

import { adminOnly, bookingEditors } from '../access/roles'
import { auditAfterChange, auditAfterDelete } from '../hooks/audit'
import { GROUPS } from './groups'

// Payment records only. P0 has no Omise integration: these fields are what P2/P3 will fill.
// Staff review slips and record payments at the shop; only admins delete payment records.
export const Payments: CollectionConfig = {
  slug: 'payments',
  labels: {
    singular: { th: 'การชำระเงิน', en: 'Payment' },
    plural: { th: 'การชำระเงิน', en: 'Payments' },
  },
  admin: {
    useAsTitle: 'ref',
    group: GROUPS.bookings,
    defaultColumns: ['booking', 'kind', 'provider', 'amount', 'status', 'createdAt'],
  },
  access: {
    read: bookingEditors,
    create: bookingEditors,
    update: bookingEditors,
    delete: adminOnly,
  },
  defaultSort: '-createdAt',
  hooks: {
    beforeChange: [
      // Stamp who reviewed a slip and when, the moment its status leaves `pending`
      ({ data, originalDoc, req }) => {
        const was = originalDoc?.status ?? 'pending'
        if (data.status && data.status !== 'pending' && was === 'pending' && !data.reviewedAt) {
          return { ...data, reviewedAt: new Date().toISOString(), reviewedBy: req.user?.id ?? null }
        }
        return data
      },
    ],
    afterChange: [auditAfterChange],
    afterDelete: [auditAfterDelete],
  },
  fields: [
    {
      name: 'booking',
      label: { th: 'การจอง', en: 'Booking' },
      type: 'relationship',
      relationTo: 'bookings',
      required: true,
      index: true,
    },
    {
      type: 'row',
      fields: [
        {
          name: 'provider',
          label: { th: 'ช่องทาง', en: 'Provider' },
          type: 'select',
          required: true,
          defaultValue: 'slip',
          options: [
            { label: 'Omise', value: 'omise' },
            { label: { th: 'สลิปโอนเงิน', en: 'Transfer slip' }, value: 'slip' },
            { label: { th: 'เงินสด', en: 'Cash' }, value: 'cash' },
            { label: { th: 'โอนเงิน', en: 'Bank transfer' }, value: 'transfer' },
          ],
        },
        {
          name: 'kind',
          label: { th: 'ประเภท', en: 'Kind' },
          type: 'select',
          required: true,
          defaultValue: 'deposit',
          options: [
            { label: { th: 'มัดจำ', en: 'Deposit' }, value: 'deposit' },
            { label: { th: 'ยอดคงเหลือ', en: 'Balance' }, value: 'balance' },
            { label: { th: 'คืนเงิน', en: 'Refund' }, value: 'refund' },
          ],
        },
        {
          name: 'amount',
          label: { th: 'จำนวนเงิน (บาท)', en: 'Amount (THB)' },
          type: 'number',
          required: true,
          min: 0,
        },
      ],
    },
    {
      name: 'status',
      label: { th: 'สถานะ', en: 'Status' },
      type: 'select',
      required: true,
      defaultValue: 'pending',
      index: true,
      admin: { position: 'sidebar' },
      options: [
        { label: { th: 'รอตรวจสอบ', en: 'Pending' }, value: 'pending' },
        { label: { th: 'สำเร็จ', en: 'Succeeded' }, value: 'succeeded' },
        { label: { th: 'ไม่สำเร็จ', en: 'Failed' }, value: 'failed' },
        { label: { th: 'ปฏิเสธสลิป', en: 'Rejected' }, value: 'rejected' },
      ],
    },
    {
      name: 'ref',
      label: { th: 'เลขอ้างอิง', en: 'Reference' },
      type: 'text',
      admin: {
        description: {
          th: 'เช่น charge ID หรือเลขที่รายการโอน',
          en: 'e.g. charge ID or transfer reference',
        },
      },
    },
    {
      name: 'slip',
      label: { th: 'สลิป', en: 'Slip' },
      type: 'upload',
      relationTo: 'media',
    },
    {
      type: 'row',
      fields: [
        {
          name: 'reviewedBy',
          label: { th: 'ตรวจโดย', en: 'Reviewed by' },
          type: 'relationship',
          relationTo: 'users',
          admin: { readOnly: true },
        },
        {
          name: 'reviewedAt',
          label: { th: 'ตรวจเมื่อ', en: 'Reviewed at' },
          type: 'date',
          admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
        },
      ],
    },
  ],
}
