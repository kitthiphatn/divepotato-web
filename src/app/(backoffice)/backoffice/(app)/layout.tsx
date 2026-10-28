import type { ReactNode } from 'react'

import { navFor } from '@/backoffice/nav'
import { getTheme, requireUser } from '@/backoffice/server'
import { Shell } from '@/backoffice/ui/Shell'

// Signed-in backoffice: left nav (desktop), icon rail (tablet), tab bar + "more" sheet (phone)
export default async function BackofficeAppLayout({ children }: { children: ReactNode }) {
  const { payload, user, role, lang, as } = await requireUser()
  const theme = await getTheme()
  const nav = navFor(role)
  const counts: Record<string, number> = {}
  if (nav.some((n) => n.key === 'bookings')) {
    const review = await payload.count({
      collection: 'bookings',
      where: { status: { equals: 'pending_review' } },
      ...as,
    })
    counts.bookings = review.totalDocs
  }
  return (
    <Shell
      nav={nav}
      counts={counts}
      user={{ name: user.name || user.email, email: user.email, role }}
      lang={lang}
      theme={theme}
    >
      {children}
    </Shell>
  )
}
