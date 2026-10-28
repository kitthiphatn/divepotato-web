import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import type { ProductInput } from '@/backoffice/actions/shop'
import { mediaLibrary } from '@/backoffice/data'
import { requireUser } from '@/backoffice/server'
import { PRODUCT_CATEGORIES, sizeRank } from '@/backoffice/shop'
import { ProductEditor } from '@/backoffice/ui/ProductEditor'

export const metadata: Metadata = { title: 'แก้ไขสินค้า · Edit product' }

const relIds = (v: unknown) =>
  (Array.isArray(v) ? v : [])
    .map((m) => (m && typeof m === 'object' ? (m as { id: number }).id : (m as number)))
    .filter(Boolean)

// /backoffice/shop/new and /backoffice/shop/[id]
export default async function ProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireUser(['admin', 'editor'])
  const { id } = await params
  if (id !== 'new' && !/^\d+$/.test(id)) notFound()
  const library = await mediaLibrary(s)

  let value: ProductInput = {
    id: null,
    slug: '',
    title: { th: '', en: '' },
    description: { th: '', en: '' },
    brand: '',
    category: '',
    images: [],
    variants: [{ id: null, sku: '', size: '', price: 0, stock: 0 }],
  }

  if (id !== 'new') {
    const read = (locale: 'th' | 'en') =>
      s.payload
        .findByID({
          collection: 'products',
          id: Number(id),
          depth: 0,
          locale,
          fallbackLocale: false,
          ...s.as,
        })
        .catch(() => null)
    const [th, en, variants] = await Promise.all([
      read('th'),
      read('en'),
      s.payload.find({
        collection: 'product-variants',
        where: { product: { equals: Number(id) } },
        pagination: false,
        depth: 0,
        ...s.as,
      }),
    ])
    if (!th || !en) notFound()
    value = {
      id: th.id,
      slug: th.slug ?? '',
      title: { th: th.title ?? '', en: en.title ?? '' },
      description: { th: th.description ?? '', en: en.description ?? '' },
      brand: th.brand ?? '',
      category: PRODUCT_CATEGORIES.find((c) => c === th.category) ?? '',
      images: relIds(th.images),
      variants: variants.docs
        .sort((a, b) => sizeRank(a.size ?? '') - sizeRank(b.size ?? ''))
        .map((x) => ({
          id: x.id,
          sku: x.sku,
          size: x.size ?? '',
          price: x.price ?? 0,
          stock: x.stock ?? 0,
        })),
    }
  }

  return (
    <ProductEditor lang={s.lang} value={value} library={library} canDelete={s.role === 'admin'} />
  )
}
