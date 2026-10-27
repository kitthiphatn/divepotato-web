import type { GlobalConfig } from 'payload'

import { contentTeam } from '../access/roles'
import { GROUPS } from '../collections/groups'
import { revalidateSite } from '../lib/revalidate'

export const Popup: GlobalConfig = {
  slug: 'popup',
  label: { th: 'ป๊อปอัปประกาศ (สไลด์รูป)', en: 'Announcement popup (slides)' },
  admin: {
    group: GROUPS.settings,
    description: {
      th: 'แสดงเป็นหน้าต่างสไลด์รูป 16:9 ทันทีที่ลูกค้าเข้าเว็บ ใช้รูป 1600×900 พิกเซล และรูปมือถือ 1080×1920 พิกเซล',
      en: 'Shown as a 16:9 image slider as soon as visitors open the site. Use 1600×900 px images, plus 1080×1920 px for phones.',
    },
  },
  access: { read: () => true, update: contentTeam },
  hooks: {
    afterChange: [revalidateSite],
  },
  fields: [
    {
      name: 'enabled',
      label: { th: 'เปิดแสดง', en: 'Show' },
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'frequency',
      label: { th: 'แสดงบ่อยแค่ไหน', en: 'How often' },
      type: 'select',
      defaultValue: 'day',
      options: [
        { label: { th: 'วันละครั้งต่อคน', en: 'Once a day per visitor' }, value: 'day' },
        { label: { th: 'ทุกครั้งที่เปิดเว็บใหม่', en: 'Every new visit' }, value: 'session' },
      ],
      admin: {
        description: {
          th: 'เมื่อแก้ไขสไลด์ ลูกค้าจะเห็นป๊อปอัปใหม่อีกครั้งเสมอ',
          en: 'Visitors always see the popup again after the slides are changed.',
        },
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'startsAt',
          label: { th: 'เริ่มแสดง', en: 'Starts' },
          type: 'date',
          admin: { date: { pickerAppearance: 'dayAndTime' } },
        },
        {
          name: 'endsAt',
          label: { th: 'สิ้นสุด', en: 'Ends' },
          type: 'date',
          admin: { date: { pickerAppearance: 'dayAndTime' } },
        },
      ],
    },
    {
      name: 'framed',
      label: {
        th: 'มีกรอบขาวรอบรูปและจุดเลื่อนสไลด์',
        en: 'White frame around the slides and dots',
      },
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: {
          th: 'ปิดไว้ รูปและจุดด้านล่างจะวางบนพื้นหลังโปร่งใส',
          en: 'When off, the slides and dots sit on the see-through backdrop.',
        },
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'autoplay',
          label: { th: 'เลื่อนสไลด์อัตโนมัติ', en: 'Auto-advance slides' },
          type: 'checkbox',
          defaultValue: false,
          admin: { width: '50%' },
        },
        {
          name: 'autoplaySeconds',
          label: { th: 'เปลี่ยนสไลด์ทุกกี่วินาที', en: 'Seconds per slide' },
          type: 'number',
          defaultValue: 5,
          min: 2,
          max: 60,
          admin: {
            width: '50%',
            condition: (data) => Boolean(data?.autoplay),
            description: {
              th: 'หยุดเลื่อนชั่วคราวเมื่อลูกค้าชี้เมาส์หรือลากรูปอยู่',
              en: 'Pauses while the visitor hovers over or drags the slides.',
            },
          },
        },
      ],
    },
    {
      name: 'slides',
      label: { th: 'สไลด์', en: 'Slides' },
      labels: {
        singular: { th: 'สไลด์', en: 'Slide' },
        plural: { th: 'สไลด์', en: 'Slides' },
      },
      type: 'array',
      minRows: 1,
      maxRows: 10,
      fields: [
        {
          name: 'image',
          label: { th: 'รูป (16:9)', en: 'Image (16:9)' },
          type: 'upload',
          relationTo: 'media',
          required: true,
          localized: true,
        },
        {
          name: 'mobileImage',
          label: { th: 'รูปสำหรับมือถือ (9:16)', en: 'Mobile image (9:16)' },
          type: 'upload',
          relationTo: 'media',
          localized: true,
          admin: {
            description: {
              th: 'ขนาด 1080×1920 พิกเซล ถ้าไม่ใส่ มือถือจะแสดงรูป 16:9 แบบเต็มกรอบ',
              en: '1080×1920 px. If empty, phones show the 16:9 image fitted inside the frame.',
            },
          },
        },
        {
          name: 'link',
          label: { th: 'ลิงก์เมื่อกดรูป (ถ้ามี)', en: 'Link when clicked (optional)' },
          type: 'text',
        },
      ],
    },
  ],
}
