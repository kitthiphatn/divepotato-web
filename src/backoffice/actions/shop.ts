'use server'

// Shop: stock per size from the grid, and the product editor (product + its size variants).
// Everything goes through the Local API as the signed-in user.
import { revalidatePath } from 'next/cache'

import { relId } from '../data'
import { SLUG_RE, slugify } from '../format'
import { BO } from '../nav'
import { actionUser, errorMessage, isSession, type ActionResult } from '../server'
import { PRODUCT_CATEGORIES, type ProductCategory } from '../shop'

type Pair = { th: string; en: string }
export type VariantInput = {
  id: number | null
  sku: string
  size: string
  price: number
  stock: number
}
export type ProductInput = {
  id: number | null
  slug: string
  title: Pair
  description: Pair
  brand: string
  category: ProductCategory | ''
  images: number[]
  variants: VariantInput[]
}

export async function setStockAction(variantId: number, stock: number): Promise<ActionResult> {
  const s = await actionUser(['admin', 'editor'])
  if (!isSession(s)) return s
  const n = Math.round(Number(stock))
  if (!Number.isFinite(n) || n < 0 || n > 9999)
    return { ok: false, message: s.L('จำนวนไม่ถูกต้อง', 'Invalid quantity') }
  try {
    await s.payload.update({
      collection: 'product-variants',
      id: variantId,
      data: { stock: n },
      ...s.as,
    })
    revalidatePath(BO, 'layout')
    return { ok: true, message: s.L(`อัปเดตสต็อกเป็น ${n} ชิ้น`, `Stock set to ${n}`) }
  } catch (err) {
    return { ok: false, message: errorMessage(err, s.L) }
  }
}

// Saves the product in Thai then English, then brings its variants in line with the table:
// removed rows are deleted, edited rows updated and new rows created.
export async function saveProductAction(v: ProductInput): Promise<ActionResult> {
  const s = await actionUser(['admin', 'editor'])
  if (!isSession(s)) return s
  const { L } = s
  const titleTh = v.title.th.trim() || v.title.en.trim()
  if (!titleTh) return { ok: false, message: L('ใส่ชื่อสินค้า', 'Enter the product name') }
  const slug = v.slug.trim() || slugify(v.title.en) || `product-${Date.now().toString(36)}`
  if (!SLUG_RE.test(slug))
    return {
      ok: false,
      message: L('slug ใช้ได้เฉพาะ a-z, 0-9 และ -', 'The slug may use a-z, 0-9 and - only'),
    }
  const category = PRODUCT_CATEGORIES.find((c) => c === v.category) ?? null

  const rows = v.variants.map((x) => ({
    id: x.id,
    sku: x.sku.trim(),
    size: x.size.trim(),
    price: Number(x.price),
    stock: Number(x.stock),
  }))
  const skus = new Set<string>()
  for (const [i, r] of rows.entries()) {
    const n = i + 1
    if (!r.sku) return { ok: false, message: L(`ใส่ SKU แถวที่ ${n}`, `Enter the SKU on row ${n}`) }
    const key = r.sku.toLowerCase()
    if (skus.has(key))
      return { ok: false, message: L(`SKU ${r.sku} ซ้ำกัน`, `SKU ${r.sku} is used twice`) }
    skus.add(key)
    if (!Number.isFinite(r.price) || r.price < 0)
      return { ok: false, message: L(`ราคาแถวที่ ${n} ไม่ถูกต้อง`, `Invalid price on row ${n}`) }
    if (!Number.isInteger(r.stock) || r.stock < 0 || r.stock > 9999)
      return { ok: false, message: L(`สต็อกแถวที่ ${n} ไม่ถูกต้อง`, `Invalid stock on row ${n}`) }
  }

  try {
    // SKUs are unique across the shop
    if (rows.length) {
      const taken = await s.payload.find({
        collection: 'product-variants',
        where: {
          and: [
            { sku: { in: rows.map((r) => r.sku) } },
            ...(v.id ? [{ product: { not_equals: v.id } }] : []),
          ],
        },
        limit: 1,
        depth: 0,
        ...s.as,
      })
      if (taken.docs[0])
        return {
          ok: false,
          message: L(
            `SKU ${taken.docs[0].sku} ใช้กับสินค้าอื่นแล้ว`,
            `SKU ${taken.docs[0].sku} belongs to another product`,
          ),
        }
    }

    const th = {
      title: titleTh,
      slug,
      brand: v.brand.trim() || null,
      category,
      description: v.description.th.trim() || null,
      images: v.images,
    }
    const doc = v.id
      ? await s.payload.update({
          collection: 'products',
          id: v.id,
          locale: 'th',
          data: th,
          ...s.as,
        })
      : await s.payload.create({ collection: 'products', locale: 'th', data: th, ...s.as })
    const id = doc.id
    await s.payload.update({
      collection: 'products',
      id,
      locale: 'en',
      data: {
        title: v.title.en.trim() || titleTh,
        description: v.description.en.trim() || null,
      },
      ...s.as,
    })

    const existing = v.id
      ? (
          await s.payload.find({
            collection: 'product-variants',
            where: { product: { equals: id } },
            pagination: false,
            depth: 0,
            ...s.as,
          })
        ).docs
      : []
    const mine = new Set(existing.map((x) => x.id))
    const keep = new Set(rows.map((r) => r.id).filter((x): x is number => x !== null))
    for (const x of existing)
      if (!keep.has(x.id))
        await s.payload.delete({ collection: 'product-variants', id: x.id, ...s.as })
    for (const r of rows) {
      const data = { product: id, sku: r.sku, size: r.size || null, price: r.price, stock: r.stock }
      if (r.id !== null && mine.has(r.id))
        await s.payload.update({ collection: 'product-variants', id: r.id, data, ...s.as })
      else await s.payload.create({ collection: 'product-variants', data, ...s.as })
    }

    revalidatePath(BO, 'layout')
    return {
      ok: true,
      id,
      redirect: `${BO}/shop/${id}`,
      message: v.id
        ? L('บันทึกสินค้าแล้ว', 'Product saved')
        : L('เพิ่มสินค้าแล้ว', 'Product added'),
    }
  } catch (err) {
    return { ok: false, message: errorMessage(err, L) }
  }
}

// Admins only: removes the product and its variants
export async function deleteProductAction(id: number): Promise<ActionResult> {
  const s = await actionUser(['admin'])
  if (!isSession(s)) return s
  const { L } = s
  try {
    const variants = await s.payload.find({
      collection: 'product-variants',
      where: { product: { equals: id } },
      pagination: false,
      depth: 0,
      ...s.as,
    })
    for (const x of variants.docs)
      if (relId(x.product) === id)
        await s.payload.delete({ collection: 'product-variants', id: x.id, ...s.as })
    await s.payload.delete({ collection: 'products', id, ...s.as })
    revalidatePath(BO, 'layout')
    return { ok: true, message: L('ลบสินค้าแล้ว', 'Product deleted'), redirect: `${BO}/shop` }
  } catch (err) {
    return { ok: false, message: errorMessage(err, L) }
  }
}
