'use client'

import { useConfig, useTranslation } from '@payloadcms/ui'

// Extra links at the bottom of the admin sidebar
export function NavLinks() {
  const { i18n } = useTranslation()
  const {
    config: {
      routes: { admin },
    },
  } = useConfig()
  return (
    <a className="nav__link dp-nav-link" href={`${admin}/departures-calendar`}>
      {i18n.language === 'th' ? 'ปฏิทินรอบออกเดินทาง' : 'Departures calendar'}
    </a>
  )
}
