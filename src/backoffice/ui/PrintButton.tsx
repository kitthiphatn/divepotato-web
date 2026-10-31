'use client'

import { useEffect } from 'react'

import { Icon } from '../icons'

export function PrintButton({ label }: { label: string }) {
  return (
    <button className="btn y" type="button" onClick={() => window.print()}>
      <Icon name="print" />
      {label}
    </button>
  )
}

// Opens the print dialog once the page has drawn (the list exports' "Export PDF")
export function AutoPrint() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 400)
    return () => clearTimeout(t)
  }, [])
  return null
}
