import type { Metadata } from 'next'
import Link from 'next/link'

import { customerStats, findBookings } from '@/backoffice/data'
import { Icon } from '@/backoffice/icons'
import { BO } from '@/backoffice/nav'
import { requireUser } from '@/backoffice/server'
import { CustomerList, type CustomerRowVM } from '@/backoffice/ui/Customers'

export const metadata: Metadata = { title: 'ลูกค้า · Customers' }

export default async function CustomersPage() {
  const s = await requireUser(['admin', 'staff'])
  const { L } = s
  const [res, bookings] = await Promise.all([
    s.payload.find({
      collection: 'customers',
      sort: 'name',
      pagination: false,
      depth: 0,
      ...s.as,
    }),
    findBookings(s),
  ])
  const rows: CustomerRowVM[] = res.docs.map((c) => {
    const st = customerStats(c.id, bookings)
    return {
      id: c.id,
      name: c.name,
      email: c.email ?? '',
      phone: c.phone ?? '',
      nationality: c.nationality ?? '',
      cert: st.cert,
      bookings: st.bookings.length,
      spent: st.spent,
      last: st.last,
    }
  })
  return (
    <>
      <div className="ph">
        <div>
          <h1>{L('ลูกค้า', 'Customers')}</h1>
          <p className="lede">
            {rows.length}{' '}
            {L('คน · ค้นหาด้วยชื่อ อีเมล หรือเบอร์โทร', 'people · search by name, email or phone')}
          </p>
        </div>
        <div className="acts">
          <Link className="btn y" href={`${BO}/customers/new`}>
            <Icon name="plus" />
            {L('เพิ่มลูกค้า', 'Add customer')}
          </Link>
        </div>
      </div>
      <CustomerList lang={s.lang} rows={rows} />
    </>
  )
}
