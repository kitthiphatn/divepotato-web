import type { GlobalConfig } from 'payload'

import { contentTeam, hiddenFromGuide } from '../access/roles'
import { GROUPS } from '../collections/groups'
import { revalidateSite } from '../lib/revalidate'

export const CookieConsent: GlobalConfig = {
  slug: 'cookie-consent',
  label: { th: 'แบนเนอร์คุกกี้', en: 'Cookie banner' },
  admin: { group: GROUPS.settings, hidden: hiddenFromGuide },
  access: { read: () => true, update: contentTeam },
  hooks: {
    afterChange: [revalidateSite],
  },
  fields: [
    {
      name: 'message',
      label: { th: 'ข้อความ', en: 'Message' },
      type: 'textarea',
      localized: true,
    },
    {
      name: 'policyUrl',
      label: { th: 'ลิงก์นโยบายความเป็นส่วนตัว', en: 'Privacy policy link' },
      type: 'text',
    },
  ],
}
