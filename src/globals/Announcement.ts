import type { GlobalConfig } from 'payload'

import { contentTeam } from '../access/roles'
import { GROUPS } from '../collections/groups'
import { revalidateSite } from '../lib/revalidate'

export const Announcement: GlobalConfig = {
  slug: 'announcement',
  label: { th: 'แถบประกาศด่วน', en: 'Announcement bar' },
  admin: {
    group: GROUPS.settings,
    description: {
      th: 'แสดงแถบด้านบนทุกหน้า เช่น งดออกเรือเนื่องจากคลื่นลม หรือโปรโมชั่นคอร์ส',
      en: 'Shown at the top of every page, e.g. trips cancelled due to weather, or a course promotion',
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
      name: 'tone',
      label: { th: 'ระดับ', en: 'Tone' },
      type: 'select',
      defaultValue: 'info',
      options: [
        { label: { th: 'แจ้งข่าว', en: 'Info' }, value: 'info' },
        { label: { th: 'เตือน', en: 'Warning' }, value: 'warning' },
      ],
    },
    {
      name: 'message',
      label: { th: 'ข้อความ', en: 'Message' },
      type: 'text',
      localized: true,
    },
    {
      name: 'link',
      label: { th: 'ลิงก์ (ถ้ามี)', en: 'Link (optional)' },
      type: 'text',
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
  ],
}
