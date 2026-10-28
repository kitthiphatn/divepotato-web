import type { Metadata } from 'next'
import Link from 'next/link'

import { Icon } from '@/backoffice/icons'
import { BO } from '@/backoffice/nav'
import { requireUser } from '@/backoffice/server'
import { CustomerForm } from '@/backoffice/ui/Customers'

export const metadata: Metadata = { title: 'เพิ่มลูกค้า · New customer' }

export default async function NewCustomerPage() {
  const s = await requireUser(['admin', 'staff'])
  const { L } = s
  return (
    <>
      <Link className="back" href={`${BO}/customers`}>
        <Icon name="back" />
        {L('ลูกค้า', 'Customers')}
      </Link>
      <div className="ph" style={{ marginTop: 4 }}>
        <div>
          <h1>{L('เพิ่มลูกค้า', 'Add customer')}</h1>
          <p className="lede">
            {L(
              'ใส่อย่างน้อยชื่อ แล้วค่อยเติมข้อมูลภายหลังได้',
              'A name is enough; add the rest later',
            )}
          </p>
        </div>
      </div>
      <CustomerForm
        lang={s.lang}
        value={{ id: null, name: '', email: '', phone: '', lineId: '', nationality: '', notes: '' }}
      />
    </>
  )
}
