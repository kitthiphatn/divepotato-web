'use client'

import { Icon } from '../icons'

export function PrintButton({ label }: { label: string }) {
  return (
    <button className="btn y" type="button" onClick={() => window.print()}>
      <Icon name="print" />
      {label}
    </button>
  )
}
