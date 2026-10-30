import type { GlobalConfig } from 'payload'

import { adminField, adminOnly } from '../access/roles'
import { GROUPS } from '../collections/groups'
import { revalidateSite } from '../lib/revalidate'

// Booking and payment settings. Admin only. The payment provider (demo, Omise or Stripe) and the
// methods offered drive the public pay page; the LINE fields are not used by any integration yet.
export const BookingSettings: GlobalConfig = {
  slug: 'booking-settings',
  label: { th: 'ตั้งค่าการจองและชำระเงิน', en: 'Booking settings' },
  admin: { group: GROUPS.bookings },
  access: { read: adminOnly, update: adminOnly },
  // The deposit % and cancellation policy show on the public trip and course pages
  hooks: { afterChange: [revalidateSite] },
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
      label: { th: 'การรับชำระเงินออนไลน์', en: 'Online payment' },
      admin: {
        description: {
          th: 'คีย์ของ Omise และ Stripe ตั้งในไฟล์ .env บนเซิร์ฟเวอร์ ไม่เก็บในฐานข้อมูล',
          en: 'Omise and Stripe keys are set in the server .env file, never in the database',
        },
      },
      fields: [
        {
          name: 'paymentProvider',
          label: { th: 'ผู้ให้บริการรับชำระเงิน', en: 'Payment provider' },
          type: 'select',
          required: true,
          defaultValue: 'demo',
          options: [
            { label: { th: 'เดโม (ไม่ตัดเงินจริง)', en: 'Demo (no real money)' }, value: 'demo' },
            { label: 'Omise', value: 'omise' },
            { label: 'Stripe', value: 'stripe' },
          ],
        },
        {
          name: 'payMethods',
          label: { th: 'ช่องทางที่เปิดให้ลูกค้า', en: 'Methods offered' },
          type: 'select',
          hasMany: true,
          defaultValue: ['card', 'promptpay', 'transfer'],
          options: [
            { label: { th: 'บัตรเครดิต/เดบิต', en: 'Credit/debit card' }, value: 'card' },
            { label: { th: 'QR พร้อมเพย์', en: 'PromptPay QR' }, value: 'promptpay' },
            { label: { th: 'โอนเงินแล้วแนบสลิป', en: 'Bank transfer with slip' }, value: 'transfer' },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'bankName', label: { th: 'ธนาคาร', en: 'Bank' }, type: 'text' },
            { name: 'accountName', label: { th: 'ชื่อบัญชี', en: 'Account name' }, type: 'text' },
            { name: 'accountNumber', label: { th: 'เลขที่บัญชี', en: 'Account number' }, type: 'text' },
          ],
        },
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
