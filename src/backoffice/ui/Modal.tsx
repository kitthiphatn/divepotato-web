'use client'

import { useEffect, type ReactNode } from 'react'

// Centered dialog from the prototype (.modal > .mbox). Closes on Escape and on the backdrop.
export function Modal({
  onClose,
  children,
  wide,
  label,
}: {
  onClose: () => void
  children: ReactNode
  wide?: boolean
  label?: string
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={`mbox${wide ? ' wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
      >
        {children}
      </div>
    </div>
  )
}

export function Soon({ L }: { L: (th: string, en: string) => string }) {
  return <span className="soon">{L('เร็วๆ นี้', 'Coming soon')}</span>
}
