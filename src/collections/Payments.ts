import type { CollectionConfig } from 'payload'

import { adminOnly, bookingEditors } from '../access/roles'
import { auditAfterChange, auditAfterDelete } from '../hooks/audit'
import { GROUPS } from './groups'

// One record per payment attempt: online card/QR charges (Omise, Stripe or the demo provider,
// `ref` = the provider's charge or PaymentIntent id), transfer slips customers upload, and
// payments staff record at the shop. Only admins delete payment records.
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
            { label: 'Stripe', value: 'stripe' },
            { label: { th: 'เดโม', en: 'Demo' }, value: 'demo' },
            { label: { th: 'สลิปโอนเงิน', en: 'Transfer slip' }, value: 'slip' },
            { label: { th: 'เงินสด', en: 'Cash' }, value: 'cash' },
            { label: { th: 'โอนเงิน', en: 'Bank transfer' }, value: 'transfer' },
          ],
        },
        {
          name: 'method',
          label: { th: 'วิธีชำระ', en: 'Method' },
          type: 'select',
          options: [
            { label: { th: 'บัตร', en: 'Card' }, value: 'card' },
            { label: { th: 'QR พร้อมเพย์', en: 'PromptPay QR' }, value: 'promptpay' },
            { label: { th: 'โอนเงิน', en: 'Bank transfer' }, value: 'transfer' },
            { label: { th: 'เงินสด', en: 'Cash' }, value: 'cash' },
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
          // Text of the QR code on the slip (bank code + transaction reference), read on upload
          name: 'slipRef',
          label: { th: 'เลขอ้างอิงจาก QR บนสลิป', en: 'Slip QR reference' },
          type: 'text',
          index: true,
          admin: { readOnly: true },
        },
        {
          name: 'slipCheck',
          label: { th: 'ผลตรวจ QR บนสลิป', en: 'Slip QR check' },
          type: 'select',
          admin: {
            readOnly: true,
            description: {
              th: 'ตรวจแค่ว่ามี QR และไม่ซ้ำกับสลิปอื่น ไม่ได้ตรวจยอดเงินหรือบัญชีผู้รับ',
              en: 'Only checks there is a QR and it was not used before; not the amount or receiver',
            },
          },
          options: [
            { label: { th: 'พบ QR', en: 'QR ok' }, value: 'ok' },
            { label: { th: 'ไม่พบ QR', en: 'No QR found' }, value: 'no_qr' },
            { label: { th: 'สลิปซ้ำ', en: 'Duplicate slip' }, value: 'duplicate' },
          ],
        },
      ],
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
