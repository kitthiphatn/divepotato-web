import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { mediaUrl, relId } from '@/backoffice/data'
import { Icon } from '@/backoffice/icons'
import { BO } from '@/backoffice/nav'
import { requireUser } from '@/backoffice/server'
import { PRODUCT_ICON, shopTabs, sizeRank } from '@/backoffice/shop'
import type { Media } from '@/payload-types'
import { SubTabs } from '@/backoffice/ui/fields'
import { ShopGrid, type ProductVM } from '@/backoffice/ui/Shop'

export const metadata: Metadata = { title: 'ร้านค้า · Shop' }

export default async function ShopPage() {
  const s = await requireUser(['admin', 'editor', 'staff'])
  // Staff work with orders only
  if (s.role === 'staff') redirect(`${BO}/shop/orders`)
  const { L } = s
  const [products, variants] = await Promise.all([
    s.payload.find({
      collection: 'products',
      draft: true,
      pagination: false,
      depth: 1,
      sort: 'title',
      locale: s.lang,
      select: { title: true, category: true, images: true },
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
      icon: PRODUCT_ICON[p.category ?? ''] ?? 'bag',
      image: mediaUrl((p.images?.[0] ?? null) as Media | number | null),
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
            {L(
              'สต็อกแยกตามไซซ์ แตะตัวเลขเพื่อปรับจำนวน แตะสินค้าเพื่อแก้ไข',
              'Stock per size; tap a number to adjust, tap a product to edit',
            )}
          </p>
        </div>
        <div className="acts">
          <Link className="btn y" href={`${BO}/shop/new`}>
            <Icon name="plus" />
            {L('เพิ่มสินค้า', 'Add product')}
          </Link>
        </div>
      </div>
      <SubTabs items={shopTabs(L, s.role, 'products')} />
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
