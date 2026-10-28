import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Icon } from '@/backoffice/icons'
import { BO } from '@/backoffice/nav'
import { requireUser } from '@/backoffice/server'
import { CustomerForm } from '@/backoffice/ui/Customers'

export const metadata: Metadata = { title: 'แก้ไขลูกค้า · Edit customer' }

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireUser(['admin', 'staff'])
  const { L } = s
  const { id } = await params
  if (!/^\d+$/.test(id)) notFound()
  const c = await s.payload
    .findByID({ collection: 'customers', id: Number(id), depth: 0, ...s.as })
    .catch(() => null)
  if (!c) notFound()
  return (
    <>
      <Link className="back" href={`${BO}/customers/${c.id}`}>
        <Icon name="back" />
        {c.name}
      </Link>
      <div className="ph" style={{ marginTop: 4 }}>
        <div>
          <h1>{L('แก้ไขข้อมูลลูกค้า', 'Edit customer')}</h1>
        </div>
      </div>
      <CustomerForm
        lang={s.lang}
        value={{
          id: c.id,
          name: c.name,
          email: c.email ?? '',
          phone: c.phone ?? '',
          lineId: c.lineId ?? '',
          nationality: c.nationality ?? '',
          notes: c.notes ?? '',
        }}
      />
    </>
  )
}
