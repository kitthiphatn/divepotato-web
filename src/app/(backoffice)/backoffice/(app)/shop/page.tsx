import type { Metadata } from 'next'
import Link from 'next/link'

import { relId } from '@/backoffice/data'
import { Icon } from '@/backoffice/icons'
import { requireUser } from '@/backoffice/server'
import { ShopGrid, type ProductVM } from '@/backoffice/ui/Shop'

export const metadata: Metadata = { title: 'ร้านค้า · Shop' }

const ICON: Record<string, string> = {
  mask: 'mask',
  fins: 'fin',
  wetsuit: 'suit',
  computer: 'watch',
  accessory: 'sparkle',
}
const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL']
const sizeRank = (s: string) => {
  const i = SIZE_ORDER.indexOf(s.trim().split(/\s+/)[0].toUpperCase())
  return i < 0 ? 100 + (Number.parseFloat(s) || 0) : i
}

export default async function ShopPage() {
  const s = await requireUser(['admin', 'editor'])
  const { L } = s
  const [products, variants] = await Promise.all([
    s.payload.find({
      collection: 'products',
      draft: true,
      pagination: false,
      depth: 0,
      sort: 'title',
      locale: s.lang,
      select: { title: true, category: true },
      ...s.as,
    }),
    s.payload.find({
      collection: 'product-variants',
      pagination: false,
      depth: 0,
      ...s.as,
    }),
  ])
  const rows: ProductVM[] = products.docs.map((p) => {
    const vs = variants.docs
      .filter((v) => relId(v.product) === p.id)
      .sort((a, b) => sizeRank(a.size ?? '') - sizeRank(b.size ?? ''))
    return {
      id: p.id,
      title: p.title ?? '',
      icon: ICON[p.category ?? ''] ?? 'bag',
      price: vs.length ? Math.min(...vs.map((v) => v.price)) : 0,
      variants: vs.map((v) => ({ id: v.id, size: v.size ?? '', stock: v.stock ?? 0 })),
    }
  })
  let low = 0
  let out = 0
  for (const p of rows)
    for (const v of p.variants) {
      if (v.stock === 0) out++
      else if (v.stock <= 2) low++
    }

  return (
    <>
      <div className="ph">
        <div>
          <h1>{L('ร้านค้า', 'Shop')}</h1>
          <p className="lede">
            {L('สต็อกแยกตามไซซ์ แตะตัวเลขเพื่อปรับจำนวน', 'Stock per size; tap a number to adjust')}
          </p>
        </div>
        <div className="acts">
          <Link className="btn y" href="/admin/collections/products/create">
            <Icon name="plus" />
            {L('เพิ่มสินค้า', 'Add product')}
          </Link>
        </div>
      </div>
      <div className="sumchips" style={{ marginBottom: 18 }}>
        <span className="pill st-review">
          {L('ใกล้หมด', 'Low')} {low} {L('ไซซ์', 'sizes')}
        </span>
        <span className="pill st-cancelled">
          {L('หมดแล้ว', 'Out')} {out} {L('ไซซ์', 'sizes')}
        </span>
        <span className="tagc">
          {rows.length} {L('สินค้า', 'products')}
        </span>
      </div>
      <ShopGrid lang={s.lang} products={rows} />
    </>
  )
}
