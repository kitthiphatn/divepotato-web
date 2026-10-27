'use client'

import { useConfig, useDocumentInfo, useTranslation } from '@payloadcms/ui'

// Sidebar link from a departure's edit page to its printable manifest
export function ManifestLink() {
  const { id } = useDocumentInfo()
  const { i18n } = useTranslation()
  const {
    config: {
      routes: { admin },
    },
  } = useConfig()
  if (!id) return null
  const th = i18n.language === 'th'
  return (
    <div style={{ marginBottom: 'var(--base)' }}>
      <a className="btn btn--style-secondary btn--size-small" href={`${admin}/manifest/${id}`}>
        {th ? 'เปิดใบรายชื่อผู้ร่วมทริป (พิมพ์ได้)' : 'Open printable manifest'}
      </a>
    </div>
  )
}
