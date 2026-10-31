import type { Metadata } from 'next'

import { findOrders } from '@/backoffice/data'
import { requireUser } from '@/backoffice/server'
import { shopTabs } from '@/backoffice/shop'
import { OrdersClient } from '@/backoffice/ui/Orders'
import { expireStaleOrders } from '@/hooks/orders'

export const metadata: Metadata = { title: 'คำสั่งซื้อ · Orders' }

const CHIP_KEYS = ['all', 'review', 'topack', 'packed', 'waiting', 'done', 'cancelled', 'expired']

// /backoffice/shop/orders: website shop orders (staff and admin, as the Orders collection allows)
export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const s = await requireUser(['admin', 'staff'])
  const sp = await searchParams
  // No background job: unpaid orders past their hold are marked expired when staff open the list
  await expireStaleOrders(s.payload)
  const orders = await findOrders(s)
  const open = Number(sp.open) || null
  return (
    <OrdersClient
      key={`${sp.open ?? ''}|${sp.status ?? ''}`}
      lang={s.lang}
      orders={orders}
      tabs={shopTabs(s.L, s.role, 'orders')}
      initial={{
        open: open && orders.some((o) => o.id === open) ? open : null,
        status: CHIP_KEYS.includes(sp.status ?? '') ? sp.status! : 'all',
      }}
    />
  )
}
