import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { findDepartures } from '@/backoffice/data'
import { Icon } from '@/backoffice/icons'
import { BO } from '@/backoffice/nav'
import { offeringOptions } from '@/backoffice/offerings'
import { requireUser } from '@/backoffice/server'
import { DepartureForm } from '@/backoffice/ui/DepartureForm'

export const metadata: Metadata = { title: 'แก้ไขรอบ · Edit departure' }

export default async function EditDeparturePage({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireUser(['admin', 'staff'])
  const { L } = s
  const { id } = await params
  if (!/^\d+$/.test(id)) notFound()
  const [d] = await findDepartures(s, { id: { equals: Number(id) } }, 1)
  if (!d) notFound()
  const offerings = await offeringOptions(s)
  return (
    <>
      <Link className="back" href={`${BO}/departures/${d.id}`}>
        <Icon name="back" />
        {d.name}
      </Link>
      <div className="ph" style={{ marginTop: 4 }}>
        <div>
          <h1>{L('แก้ไขรอบ', 'Edit departure')}</h1>
          <p className="lede">
            {L(
              'ที่นั่งที่จองแล้วนับให้อัตโนมัติจากการจอง',
              'Booked seats are counted from the bookings automatically',
            )}
          </p>
        </div>
      </div>
      <DepartureForm
        lang={s.lang}
        offerings={offerings}
        value={{
          id: d.id,
          kind: d.kind,
          offeringId: d.offeringId ?? 0,
          start: d.start,
          end: d.end,
          capacity: d.capacity,
          boat: d.boat,
          status: d.status as 'open' | 'full' | 'closed',
          notes: d.notes,
        }}
      />
    </>
  )
}
