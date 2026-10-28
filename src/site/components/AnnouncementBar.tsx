'use client'

import { useEffect, useState } from 'react'

import { isWithinWindow } from '@/site/consent'

// Announcement global: shown on every page while enabled and inside its start/end window.
// The window is checked in the browser too, so a cached page still hides it on time.
export function AnnouncementBar({
  message,
  tone,
  href,
  startsAt,
  endsAt,
}: {
  message: string
  tone: 'info' | 'warning'
  href: string | null
  startsAt?: string | null
  endsAt?: string | null
}) {
  const [live, setLive] = useState(true)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- time check after hydration
    setLive(isWithinWindow(startsAt, endsAt))
  }, [startsAt, endsAt])
  if (!live) return null
  return (
    <div className={`ann${tone === 'warning' ? ' warn' : ''}`} id="ann" role="status">
      {href ? <a href={href}>{message}</a> : message}
    </div>
  )
}
