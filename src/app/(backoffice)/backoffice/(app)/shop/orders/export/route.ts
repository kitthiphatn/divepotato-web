import { csvResponse } from '@/backoffice/csv'
import { findOrders } from '@/backoffice/data'
import { todayYmd } from '@/backoffice/format'
import { filterOrders, ORDER_CHIP_KEYS, orderCsv } from '@/backoffice/lists'
import { routeUser } from '@/backoffice/server'
import { expireStaleOrders } from '@/hooks/orders'

export const dynamic = 'force-dynamic'

// GET /backoffice/shop/orders/export?status=<chip>&q=<search>: the rows of the orders list
// with the same filter, as CSV (same roles and access rules as the list)
export async function GET(req: Request) {
  const s = await routeUser(['admin', 'staff'])
  if (s instanceof Response) return s
  const sp = new URL(req.url).searchParams
  const chip = ORDER_CHIP_KEYS.includes(sp.get('status') ?? '') ? sp.get('status')! : 'all'
  await expireStaleOrders(s.payload)
  const list = filterOrders(await findOrders(s), chip, sp.get('q') ?? '')
  return csvResponse(orderCsv(list, s.lang), `orders-${todayYmd()}.csv`)
}
