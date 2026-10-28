import type { Metadata } from 'next'
import Link from 'next/link'

import { addDays, todayYmd } from '@/backoffice/format'
import { Icon } from '@/backoffice/icons'
import { BO } from '@/backoffice/nav'
import { offeringOptions } from '@/backoffice/offerings'
import { requireUser } from '@/backoffice/server'
import { DepartureForm } from '@/backoffice/ui/DepartureForm'

export const metadata: Metadata = { title: 'เพิ่มรอบใหม่ · New departure' }

export default async function NewDeparturePage() {
  const s = await requireUser(['admin'])
  const { L } = s
  const offerings = await offeringOptions(s)
  const start = addDays(todayYmd(), 7)
  return (
    <>
      <Link className="back" href={`${BO}/departures`}>
        <Icon name="back" />
        {L('รอบออกเดินทาง', 'Departures')}
      </Link>
      <div className="ph" style={{ marginTop: 4 }}>
        <div>
          <h1>{L('เพิ่มรอบใหม่', 'New departure')}</h1>
          <p className="lede">
            {L('ลูกค้าจองได้ทันทีเมื่อรอบเปิดรับจอง', 'Customers can book as soon as it is open')}
          </p>
        </div>
      </div>
      <DepartureForm
        lang={s.lang}
        offerings={offerings}
        value={{
          kind: 'trip',
          offeringId: 0,
          start,
          end: start,
          capacity: 12,
          boat: '',
          status: 'open',
          notes: '',
        }}
      />
    </>
  )
}
