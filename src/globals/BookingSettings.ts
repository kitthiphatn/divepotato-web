import type { GlobalConfig } from 'payload'

import { adminField, adminOnly } from '../access/roles'
import { GROUPS } from '../collections/groups'

// Booking and payment settings. Admin only; the payment/LINE fields are stored for P2 and are
// not used by any integration yet.
export const BookingSettings: GlobalConfig = {
  slug: 'booking-settings',
  label: { th: 'ตั้งค่าการจองและชำระเงิน', en: 'Booking settings' },
  admin: { group: GROUPS.bookings },
  access: { read: adminOnly, update: adminOnly },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'depositPct',
          label: { th: 'มัดจำ (%)', en: 'Deposit (%)' },
          type: 'number',
          required: true,
          defaultValue: 30,
          min: 0,
          max: 100,
        },
        {
          name: 'holdMinutes',
          label: { th: 'จองที่นั่งไว้ชั่วคราว (นาที)', en: 'Seat hold (minutes)' },
          type: 'number',
          required: true,
          defaultValue: 15,
          min: 1,
        },
      ],
    },
    {
      name: 'cancellationPolicy',
      label: { th: 'นโยบายการยกเลิก', en: 'Cancellation policy' },
      type: 'richText',
      localized: true,
    },
    {
      type: 'collapsible',
      label: { th: 'Omise และ PromptPay', en: 'Omise and PromptPay' },
      fields: [
        { name: 'omisePublicKey', label: 'Omise public key', type: 'text' },
        {
          name: 'omiseSecretKey',
          label: 'Omise secret key',
          type: 'text',
          // Never shown to anyone but admins (also hidden from the API for other roles)
          access: { read: adminField, update: adminField },
          admin: { description: { th: 'ใช้ในเฟส 2', en: 'Used from phase 2' } },
        },
        { name: 'promptPayId', label: 'PromptPay ID', type: 'text' },
      ],
    },
    {
      type: 'collapsible',
      label: { th: 'การแจ้งเตือน', en: 'Notifications' },
      fields: [
        {
          name: 'lineChannelToken',
          label: 'LINE channel access token',
          type: 'text',
          access: { read: adminField, update: adminField },
        },
        {
          name: 'lineTarget',
          label: { th: 'LINE ผู้รับแจ้งเตือน (user/group ID)', en: 'LINE target (user/group ID)' },
          type: 'text',
        },
        {
          name: 'notifyEmail',
          label: { th: 'อีเมลรับแจ้งเตือน', en: 'Notification email' },
          type: 'email',
        },
      ],
    },
  ],
}
