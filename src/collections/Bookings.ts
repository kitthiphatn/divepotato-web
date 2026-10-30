import type { CollectionConfig } from 'payload'

import { adminOnly, bookingEditors, bookingReaders, roleOf } from '../access/roles'
import { auditAfterChange, auditAfterDelete } from '../hooks/audit'
import { prepareBooking, syncSeatsAfterChange, syncSeatsAfterDelete } from '../hooks/bookings'
import { GROUPS } from './groups'
import { LEVEL_OPTIONS } from './Trips'

export const BOOKING_STATUSES = [
  'hold',
  'pending_review',
  'deposit_paid',
  'paid',
  'cancelled',
  'refunded',
  'completed',
  'expired',
] as const

const money = (name: string, label: { th: string; en: string }) => ({
  name,
  label,
  type: 'number' as const,
  defaultValue: 0,
  admin: {
    readOnly: true,
    description: { th: 'คำนวณอัตโนมัติ', en: 'Calculated automatically' },
  },
})

export const Bookings: CollectionConfig = {
  slug: 'bookings',
  labels: {
    singular: { th: 'การจอง', en: 'Booking' },
    plural: { th: 'การจอง', en: 'Bookings' },
  },
  admin: {
    useAsTitle: 'code',
    group: GROUPS.bookings,
    defaultColumns: ['code', 'departure', 'customer', 'status', 'total', 'createdAt'],
    listSearchableFields: ['code'],
    // Guides only use bookings through the printable manifest
    hidden: ({ user }) => roleOf(user) === 'guide',
  },
  access: {
    read: bookingReaders,
    update: bookingEditors,
    // Staff take bookings by phone, LINE and walk-in from the backoffice
    create: bookingEditors,
    delete: adminOnly,
  },
  defaultSort: '-createdAt',
  hooks: {
    beforeChange: [prepareBooking],
    afterChange: [auditAfterChange, syncSeatsAfterChange],
    afterDelete: [auditAfterDelete, syncSeatsAfterDelete],
  },
  fields: [
    {
      name: 'code',
      label: { th: 'รหัสการจอง', en: 'Booking code' },
      type: 'text',
      unique: true,
      index: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: {
          th: 'ออกให้อัตโนมัติ เช่น DP-2611-0001',
          en: 'Automatic, e.g. DP-2611-0001',
        },
      },
    },
    {
      name: 'status',
      label: { th: 'สถานะ', en: 'Status' },
      type: 'select',
      required: true,
      defaultValue: 'hold',
      index: true,
      admin: { position: 'sidebar' },
      options: [
        { label: { th: 'กันที่นั่งไว้ (รอชำระ)', en: 'Hold' }, value: 'hold' },
        { label: { th: 'รอตรวจสลิป', en: 'Pending review' }, value: 'pending_review' },
        { label: { th: 'ชำระมัดจำแล้ว', en: 'Deposit paid' }, value: 'deposit_paid' },
        { label: { th: 'ชำระครบแล้ว', en: 'Paid' }, value: 'paid' },
        { label: { th: 'ยกเลิก', en: 'Cancelled' }, value: 'cancelled' },
        { label: { th: 'คืนเงินแล้ว', en: 'Refunded' }, value: 'refunded' },
        { label: { th: 'จบทริปแล้ว', en: 'Completed' }, value: 'completed' },
        { label: { th: 'หมดเวลา', en: 'Expired' }, value: 'expired' },
      ],
    },
    {
      name: 'holdExpiresAt',
      label: { th: 'หมดเวลากันที่นั่ง', en: 'Hold expires at' },
      type: 'date',
      admin: { position: 'sidebar', date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      // Secret part of the customer's pay link (/pay/<code>?t=<token>), set on create. Never
      // returned by the API or shown in the admin; the pay page reads it with overrideAccess.
      name: 'payToken',
      type: 'text',
      access: { read: () => false, create: () => false, update: () => false },
      admin: { hidden: true },
    },
    {
      name: 'source',
      label: { th: 'ช่องทางการจอง', en: 'Source' },
      type: 'select',
      defaultValue: 'website',
      admin: { position: 'sidebar' },
      options: [
        { label: { th: 'เว็บไซต์', en: 'Website' }, value: 'website' },
        { label: 'LINE', value: 'line' },
        { label: { th: 'โทรศัพท์', en: 'Phone' }, value: 'phone' },
        { label: { th: 'หน้าร้าน', en: 'Walk-in' }, value: 'walk_in' },
        { label: { th: 'เอเจนต์', en: 'Agent' }, value: 'agent' },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'departure',
          label: { th: 'รอบออกเดินทาง', en: 'Departure' },
          type: 'relationship',
          relationTo: 'departures',
          required: true,
          index: true,
        },
        {
          name: 'customer',
          label: { th: 'ลูกค้า (ผู้จอง)', en: 'Customer' },
          type: 'relationship',
          relationTo: 'customers',
          required: true,
          index: true,
        },
      ],
    },
    {
      name: 'participants',
      label: { th: 'ผู้ร่วมทริป', en: 'Participants' },
      type: 'array',
      minRows: 1,
      labels: {
        singular: { th: 'ผู้ร่วมทริป', en: 'Participant' },
        plural: { th: 'ผู้ร่วมทริป', en: 'Participants' },
      },
      admin: { initCollapsed: false },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'name', label: { th: 'ชื่อ', en: 'Name' }, type: 'text', required: true },
            {
              name: 'certLevel',
              label: { th: 'ระดับบัตร', en: 'Cert level' },
              type: 'select',
              options: LEVEL_OPTIONS,
            },
            { name: 'certNo', label: { th: 'เลขบัตร', en: 'Cert no.' }, type: 'text' },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'suitSize',
              label: { th: 'ไซซ์ชุดเว็ทสูท', en: 'Wetsuit size' },
              type: 'select',
              options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
            },
            {
              name: 'shoeSize',
              label: { th: 'ไซซ์รองเท้า/ฟิน (EU)', en: 'Shoe/fin size (EU)' },
              type: 'text',
            },
            {
              name: 'rentals',
              label: { th: 'อุปกรณ์เช่า', en: 'Rental items' },
              type: 'relationship',
              relationTo: 'rental-items',
              hasMany: true,
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'healthOk',
              label: { th: 'ผ่านแบบสอบถามสุขภาพ', en: 'Health form OK' },
              type: 'checkbox',
              defaultValue: true,
            },
            {
              name: 'healthNotes',
              label: { th: 'หมายเหตุสุขภาพ', en: 'Health notes' },
              type: 'text',
            },
          ],
        },
      ],
    },
    {
      type: 'row',
      fields: [
        money('total', { th: 'ยอดรวม (บาท)', en: 'Total (THB)' }),
        money('deposit', { th: 'มัดจำ (บาท)', en: 'Deposit (THB)' }),
        money('balance', { th: 'ยอดคงเหลือ (บาท)', en: 'Balance (THB)' }),
      ],
    },
    {
      name: 'timeline',
      label: { th: 'ไทม์ไลน์', en: 'Timeline' },
      type: 'array',
      labels: {
        singular: { th: 'เหตุการณ์', en: 'Event' },
        plural: { th: 'ไทม์ไลน์', en: 'Timeline' },
      },
      admin: { initCollapsed: true },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'at',
              label: { th: 'เวลา', en: 'At' },
              type: 'date',
              required: true,
              admin: { date: { pickerAppearance: 'dayAndTime' } },
            },
            {
              name: 'event',
              label: { th: 'เหตุการณ์', en: 'Event' },
              type: 'text',
              required: true,
            },
            {
              name: 'by',
              label: { th: 'โดย', en: 'By' },
              type: 'relationship',
              relationTo: 'users',
            },
          ],
        },
        { name: 'note', label: { th: 'หมายเหตุ', en: 'Note' }, type: 'text' },
      ],
    },
  ],
}
