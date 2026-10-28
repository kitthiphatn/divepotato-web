import type { Metadata } from 'next'

import { BO } from '@/backoffice/nav'
import { requireUser } from '@/backoffice/server'
import { SubTabs } from '@/backoffice/ui/fields'
import { RentalsManager, type RentalRow } from '@/backoffice/ui/Rentals'

export const metadata: Metadata = { title: 'อุปกรณ์ให้เช่า · Rental gear' }

// /backoffice/shop/rentals: gear hired out per day, with stock
export default async function RentalsPage() {
  const s = await requireUser(['admin', 'editor'])
  const { L } = s
  const opts = {
    pagination: false as const,
    sort: 'name',
    depth: 0,
    fallbackLocale: false as const,
    ...s.as,
  }
  const [th, en] = await Promise.all([
    s.payload.find({ collection: 'rental-items', locale: 'th', ...opts }),
    s.payload.find({ collection: 'rental-items', locale: 'en', ...opts }),
  ])
  const enById = new Map(en.docs.map((d) => [d.id, d]))
  const items: RentalRow[] = th.docs.map((d) => ({
    id: d.id,
    name: { th: d.name ?? '', en: enById.get(d.id)?.name ?? '' },
    pricePerDay: d.pricePerDay ?? 0,
    stock: d.stock ?? 0,
  }))
  return (
    <>
      <div className="ph">
        <div>
          <h1>{L('ร้านค้า', 'Shop')}</h1>
          <p className="lede">
            {L(
              'อุปกรณ์ดำน้ำให้เช่ารายวัน ราคาและจำนวนที่มี',
              'Dive gear for hire per day, with price and stock',
            )}
          </p>
        </div>
      </div>
      <SubTabs
        items={[
          { href: `${BO}/shop`, label: L('สินค้า', 'Products'), icon: 'bag', on: false },
          {
            href: `${BO}/shop/rentals`,
            label: L('อุปกรณ์ให้เช่า', 'Rental gear'),
            icon: 'suit',
            on: true,
          },
        ]}
      />
      <RentalsManager lang={s.lang} items={items} canDelete={s.role === 'admin'} />
    </>
  )
}
