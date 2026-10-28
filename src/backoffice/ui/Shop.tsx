'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { setStockAction } from '../actions/shop'
import { money } from '../format'
import { translator, type Lang } from '../i18n'
import { Icon } from '../icons'
import { BO } from '../nav'
import { isOneSize } from '../shop'
import { Modal } from './Modal'
import { useToast } from './Toast'

export type ProductVM = {
  id: number
  title: string
  icon: string
  image: string | null
  price: number
  variants: { id: number; size: string; stock: number }[]
}

export function ShopGrid({ lang, products }: { lang: Lang; products: ProductVM[] }) {
  const L = translator(lang)
  const toast = useToast()
  const router = useRouter()
  const [pending, start] = useTransition()
  const [edit, setEdit] = useState<{
    p: ProductVM
    v: ProductVM['variants'][number]
    n: number
  } | null>(null)
  const sizeLabel = (s: string) => (isOneSize(s) ? L('ฟรีไซซ์', 'One size') : s)

  return (
    <>
      <div className="prods">
        {products.length === 0 && (
          <div className="card empty">{L('ยังไม่มีสินค้า', 'No products yet')}</div>
        )}
        {products.map((p) => {
          const total = p.variants.reduce((a, v) => a + v.stock, 0)
          return (
            <section
              key={p.id}
              className="card prod"
              // The whole card opens the editor; the size buttons and links keep their own action
              onClick={(e) => {
                if ((e.target as HTMLElement).closest('button, a')) return
                router.push(`${BO}/shop/${p.id}`)
              }}
            >
              <Link className="pim" href={`${BO}/shop/${p.id}`} tabIndex={-1} aria-hidden="true">
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image} alt="" loading="lazy" />
                ) : (
                  <Icon name={p.icon} />
                )}
              </Link>
              <div>
                <div className="ptop">
                  <div>
                    <h3>
                      <Link href={`${BO}/shop/${p.id}`}>{p.title}</Link>
                    </h3>
                    <small className="num">
                      {money(p.price)} · {L('รวม', 'total')} {total} {L('ชิ้น', 'pcs')}
                    </small>
                  </div>
                  <Link className="btn t sm" href={`${BO}/shop/${p.id}`}>
                    <Icon name="edit" />
                    {L('แก้ไข', 'Edit')}
                  </Link>
                </div>
                <div className="sz">
                  {p.variants.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      className={v.stock === 0 ? 'out' : v.stock <= 2 ? 'low' : ''}
                      onClick={() => setEdit({ p, v, n: v.stock })}
                      aria-label={`${p.title} ${sizeLabel(v.size)}: ${v.stock}`}
                    >
                      <span>{sizeLabel(v.size)}</span>
                      <b className="num">{v.stock === 0 ? L('หมด', 'Out') : v.stock}</b>
                    </button>
                  ))}
                  {p.variants.length === 0 && (
                    <span className="muted small">{L('ยังไม่มีไซซ์', 'No sizes yet')}</span>
                  )}
                </div>
              </div>
            </section>
          )
        })}
      </div>

      {edit && (
        <Modal onClose={() => setEdit(null)} label={L('ปรับสต็อก', 'Adjust stock')}>
          <h3>{edit.p.title}</h3>
          <p className="s">
            {L('ไซซ์', 'Size')} {sizeLabel(edit.v.size)} · {L('ปรับจำนวนในสต็อก', 'Adjust stock')}
          </p>
          <div className="stepq">
            <button
              type="button"
              aria-label={L('ลด', 'Minus')}
              onClick={() => setEdit((e) => e && { ...e, n: Math.max(0, e.n - 1) })}
            >
              −
            </button>
            <output className="num" aria-live="polite">
              {edit.n}
            </output>
            <button
              type="button"
              aria-label={L('เพิ่ม', 'Plus')}
              onClick={() => setEdit((e) => e && { ...e, n: e.n + 1 })}
            >
              +
            </button>
          </div>
          <div className="acts">
            <button className="btn o" type="button" onClick={() => setEdit(null)}>
              {L('ยกเลิก', 'Cancel')}
            </button>
            <button
              className="btn y"
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await setStockAction(edit.v.id, edit.n)
                  toast(r.message, r.ok)
                  if (r.ok) setEdit(null)
                })
              }
            >
              {L('บันทึก', 'Save')}
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
