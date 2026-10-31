import type { Metadata } from 'next'

import { findOrders, paidOf } from '@/backoffice/data'
import { money } from '@/backoffice/format'
import { ORDER_STATUS_LABEL, pair } from '@/backoffice/i18n'
import {
  filterOrders,
  itemCount,
  listQuery,
  ORDER_CHIP_KEYS,
  orderChipLabel,
  orderDue,
  orderTotals,
  payMethods,
  stamp,
} from '@/backoffice/lists'
import { BO } from '@/backoffice/nav'
import { requireUser } from '@/backoffice/server'
import { ListPrint } from '@/backoffice/ui/ListPrint'
import { expireStaleOrders } from '@/hooks/orders'

export const metadata: Metadata = { title: 'รายงานคำสั่งซื้อ · Orders report' }

// /backoffice/shop/orders/print?status=<chip>&q=<search>: the shop orders list with the same
// filter, laid out for A4 landscape; "Export PDF" on the list opens it
export default async function OrdersPrintPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const s = await requireUser(['admin', 'staff'])
  const { L, lang } = s
  const sp = await searchParams
  const chip = ORDER_CHIP_KEYS.includes(sp.status ?? '') ? sp.status! : 'all'
  const q = (sp.q ?? '').trim()
  await expireStaleOrders(s.payload)
  const list = filterOrders(await findOrders(s), chip, q)
  const site = await s.payload.findGlobal({ slug: 'site-settings', depth: 0, ...s.as })
  const filter = [
    `${L('สถานะ', 'Status')}: ${orderChipLabel(lang)[chip]}`,
    q ? `${L('ค้นหา', 'Search')}: "${q}"` : '',
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <ListPrint
      lang={lang}
      title={L('รายงานคำสั่งซื้อ', 'Shop orders report')}
      phone={site.contact?.phone}
      filter={filter}
      backHref={`${BO}/shop/orders${chip !== 'all' ? listQuery(chip, '') : ''}`}
      noun={L('คำสั่งซื้อ', 'orders')}
      totals={orderTotals(list)}
      cols={[
        { label: L('รหัสคำสั่งซื้อ', 'Order') },
        { label: L('วันที่สั่ง', 'Created') },
        { label: L('สถานะ', 'Status') },
        { label: L('ลูกค้า', 'Customer') },
        { label: L('สินค้า', 'Items') },
        { label: L('ชิ้น', 'Pcs'), num: true, sum: 'people' },
        { label: L('ยอดรวม', 'Total'), num: true, sum: 'total' },
        { label: L('ชำระแล้ว', 'Paid'), num: true, sum: 'paid' },
        { label: L('ค้างชำระ', 'Due'), num: true, sum: 'due' },
        { label: L('วิธีชำระ', 'Paid by') },
      ]}
      rows={list.map((o) => ({
        key: o.id,
        cells: [
          <>
            <b className="nw">{o.code}</b>
            <br />
            <small>
              {o.delivery === 'ship' ? L('ส่งไปรษณีย์', 'Post') : L('รับที่ร้าน', 'Pickup')}
            </small>
          </>,
          <span key="at" className="nw">
            {stamp(o.createdAt)}
          </span>,
          <span key="st" className="nw">
            {pair(lang, ORDER_STATUS_LABEL[o.status], o.status)}
          </span>,
          <>
            <b>{o.customer?.name ?? '—'}</b>
            {(o.customer?.phone || o.customer?.email) && (
              <>
                <br />
                <small>{[o.customer?.phone, o.customer?.email].filter(Boolean).join(' · ')}</small>
              </>
            )}
          </>,
          <small key="items">
            {o.items
              .map((it) => `${it.title}${it.size ? ` (${it.size})` : ''} ×${it.qty}`)
              .join(', ')}
          </small>,
          itemCount(o),
          money(o.total),
          money(paidOf(o)),
          money(orderDue(o)),
          <small key="by">{payMethods(o.payments, lang) || '—'}</small>,
        ],
      }))}
    />
  )
}
