import type { GlobalConfig } from 'payload'

import { contentTeam, hiddenFromGuide } from '../access/roles'
import { GROUPS } from '../collections/groups'
import { revalidateSite } from '../lib/revalidate'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: { th: 'ตั้งค่าเว็บไซต์', en: 'Site settings' },
  admin: { group: GROUPS.settings, hidden: hiddenFromGuide },
  access: { read: () => true, update: contentTeam },
  hooks: { afterChange: [revalidateSite] },
  fields: [
    {
      name: 'siteName',
      label: { th: 'ชื่อเว็บไซต์', en: 'Site name' },
      type: 'text',
      localized: true,
      defaultValue: 'Dive Potato Scuba Diving',
    },
    {
      name: 'logo',
      label: { th: 'โลโก้', en: 'Logo' },
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: {
          th: 'ใช้ PNG พื้นใส หรือ SVG สูงอย่างน้อย 80px',
          en: 'Use a transparent PNG or SVG, at least 80px tall.',
        },
      },
    },
    {
      name: 'favicon',
      label: { th: 'ไอคอนแท็บเบราว์เซอร์ (favicon)', en: 'Browser tab icon (favicon)' },
      type: 'upload',
      relationTo: 'media',
    },
    {
      type: 'group',
      name: 'contact',
      label: { th: 'ช่องทางติดต่อ', en: 'Contact' },
      fields: [
        { name: 'phone', label: { th: 'เบอร์โทร', en: 'Phone' }, type: 'text' },
        { name: 'lineId', label: 'LINE ID', type: 'text' },
        { name: 'lineUrl', label: { th: 'ลิงก์ LINE', en: 'LINE link' }, type: 'text' },
        { name: 'email', label: { th: 'อีเมล', en: 'Email' }, type: 'email' },
        { name: 'whatsappUrl', label: 'WhatsApp', type: 'text' },
        { name: 'facebookUrl', label: 'Facebook', type: 'text' },
        { name: 'instagramUrl', label: 'Instagram', type: 'text' },
        { name: 'tiktokUrl', label: 'TikTok', type: 'text' },
        { name: 'youtubeUrl', label: 'YouTube', type: 'text' },
        {
          name: 'hours',
          label: { th: 'เวลาทำการ', en: 'Opening hours' },
          type: 'text',
          localized: true,
        },
        {
          name: 'address',
          label: { th: 'ที่อยู่ร้าน', en: 'Shop address' },
          type: 'textarea',
          localized: true,
        },
      ],
    },
    {
      type: 'group',
      name: 'hero',
      label: { th: 'ส่วนหัวหน้าแรก', en: 'Homepage hero' },
      fields: [
        { name: 'title', label: { th: 'หัวข้อ', en: 'Title' }, type: 'text', localized: true },
        {
          name: 'subtitle',
          label: { th: 'คำโปรย', en: 'Subtitle' },
          type: 'textarea',
          localized: true,
        },
        {
          name: 'background',
          label: { th: 'รูปพื้นหลัง', en: 'Background image' },
          type: 'upload',
          relationTo: 'media',
        },
      ],
    },
    {
      name: 'footerNote',
      label: { th: 'ข้อความท้ายเว็บ', en: 'Footer note' },
      type: 'textarea',
      localized: true,
    },
    {
      name: 'analyticsId',
      label: { th: 'รหัส Google Analytics', en: 'Google Analytics ID' },
      type: 'text',
      admin: {
        placeholder: 'G-XXXXXXXXXX',
        description: {
          th: 'Measurement ID ของ GA4 เว้นว่างไว้ถ้าไม่ใช้',
          en: 'GA4 Measurement ID. Leave empty to turn off.',
        },
      },
      validate: (value: string | null | undefined) =>
        !value || /^G-[A-Z0-9]{4,}$/.test(value.trim())
          ? true
          : 'รหัสต้องขึ้นต้นด้วย G- เช่น G-AB12CD34EF',
    },
  ],
}
