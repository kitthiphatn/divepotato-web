'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import {
  deleteRentalAction,
  saveRentalAction,
  setRentalStockAction,
  type RentalInput,
} from '../actions/rentals'
import { money } from '../format'
import { translator, type Lang } from '../i18n'
import { Icon } from '../icons'
import { LocTabs, type Loc } from './fields'
import { Modal } from './Modal'
import { useToast } from './Toast'

export type RentalRow = RentalInput & { id: number }

// Rental gear: list with price per day and stock; tap the stock to adjust with +/-, tap the row
// to edit (TH/EN name, price, stock). Deleting is admin-only, like products.
export function RentalsManager({
  lang,
  items,
  canDelete,
}: {
  lang: Lang
  items: RentalRow[]
  canDelete: boolean
}) {
  const L = translator(lang)
  const toast = useToast()
  const router = useRouter()
  const [pending, start] = useTransition()
  const [edit, setEdit] = useState<RentalInput | null>(null)
  const [stk, setStk] = useState<{ r: RentalRow; n: number } | null>(null)
  const [confirmDel, setConfirmDel] = useState(false)
  const [tl, setTl] = useState<Loc>(lang)
  const name = (r: RentalInput) => (lang === 'en' ? r.name.en || r.name.th : r.name.th || r.name.en)
  const open = (v: RentalInput) => {
    setConfirmDel(false)
    setTl(lang)
    setEdit(v)
  }
  const after = (ok: boolean) => {
    if (!ok) return
    setEdit(null)
    setStk(null)
    router.refresh()
  }
  const save = () =>
    edit &&
    start(async () => {
      const r = await saveRentalAction(edit)
      toast(r.message, r.ok)
      after(r.ok)
    })
  const saveStock = () =>
    stk &&
    start(async () => {
      const r = await setRentalStockAction(stk.r.id, stk.n)
      toast(r.message, r.ok)
      after(r.ok)
    })
  const remove = () =>
    edit?.id &&
    start(async () => {
      const r = await deleteRentalAction(edit.id!)
      toast(r.message, r.ok)
      after(r.ok)
    })
  const total = items.reduce((a, r) => a + r.stock, 0)

  return (
    <>
      <div className="sumchips" style={{ marginBottom: 18 }}>
        <span className="pill st-cancelled">
          {L('หมดแล้ว', 'Out')} {items.filter((r) => r.stock === 0).length} {L('รายการ', 'items')}
        </span>
        <span className="tagc">
          {items.length} {L('รายการ', 'items')} · {total} {L('ชิ้น', 'pcs')}
        </span>
        <button
          className="btn y sm"
          type="button"
          style={{ marginLeft: 'auto' }}
          onClick={() => open({ id: null, name: { th: '', en: '' }, pricePerDay: 0, stock: 0 })}
        >
          <Icon name="plus" />
          {L('เพิ่มอุปกรณ์', 'Add item')}
        </button>
      </div>
      <div className="card p0">
        <div className="rows">
          <div className="row rrow head">
            <span>{L('อุปกรณ์', 'Item')}</span>
            <span>{L('ค่าเช่าต่อวัน', 'Per day')}</span>
            <span>{L('สต็อก', 'Stock')}</span>
            <span />
          </div>
          {items.length === 0 && (
            <div className="empty">{L('ยังไม่มีอุปกรณ์ให้เช่า', 'No rental items yet')}</div>
          )}
          {items.map((r) => (
            <div
              key={r.id}
              className="row rrow"
              role="button"
              tabIndex={0}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest('button')) return
                open(r)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target === e.currentTarget) open(r)
              }}
            >
              <span className="c2" style={{ paddingLeft: 0 }}>
                <b>{name(r)}</b>
                <small>{lang === 'en' ? r.name.th : r.name.en}</small>
              </span>
              <span className="amt">
                <b className="num">{money(r.pricePerDay)}</b>
              </span>
              <span className="st">
                <span className="sz">
                  <button
                    type="button"
                    className={r.stock === 0 ? 'out' : r.stock <= 2 ? 'low' : ''}
                    onClick={() => setStk({ r, n: r.stock })}
                    aria-label={`${name(r)}: ${r.stock}`}
                  >
                    <span>{L('สต็อก', 'Stock')}</span>
                    <b className="num">{r.stock === 0 ? L('หมด', 'Out') : r.stock}</b>
                  </button>
                </span>
              </span>
              <span className="chev">
                <Icon name="chev" />
              </span>
            </div>
          ))}
        </div>
        <p className="hint" style={{ padding: '14px 22px' }}>
          {L(
            'แตะตัวเลขสต็อกเพื่อปรับจำนวน แตะรายการเพื่อแก้ไข',
            'Tap the stock to adjust it, tap a row to edit',
          )}
        </p>
      </div>

      {stk && (
        <Modal onClose={() => setStk(null)} label={L('ปรับสต็อก', 'Adjust stock')}>
          <h3>{name(stk.r)}</h3>
          <p className="s">{L('ปรับจำนวนในสต็อก', 'Adjust stock')}</p>
          <div className="stepq">
            <button
              type="button"
              aria-label={L('ลด', 'Minus')}
              onClick={() => setStk((x) => x && { ...x, n: Math.max(0, x.n - 1) })}
            >
              −
            </button>
            <output className="num" aria-live="polite">
              {stk.n}
            </output>
            <button
              type="button"
              aria-label={L('เพิ่ม', 'Plus')}
              onClick={() => setStk((x) => x && { ...x, n: x.n + 1 })}
            >
              +
            </button>
          </div>
          <div className="acts">
            <button className="btn o" type="button" onClick={() => setStk(null)}>
              {L('ยกเลิก', 'Cancel')}
            </button>
            <button className="btn y" type="button" disabled={pending} onClick={saveStock}>
              {L('บันทึก', 'Save')}
            </button>
          </div>
        </Modal>
      )}

      {edit && (
        <Modal
          onClose={() => setEdit(null)}
          label={edit.id ? L('แก้ไขอุปกรณ์', 'Edit item') : L('เพิ่มอุปกรณ์', 'Add item')}
        >
          <h3>
            {edit.id
              ? L('แก้ไขอุปกรณ์ให้เช่า', 'Edit rental item')
              : L('เพิ่มอุปกรณ์ให้เช่า', 'Add rental item')}
          </h3>
          <p className="s">
            {L('ลูกค้าเลือกเช่าได้ตอนจองทริป', 'Customers can add it when booking a trip')}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              save()
            }}
          >
            <LocTabs tl={tl} onChange={setTl} />
            <label className="field">
              <span>
                {L('ชื่ออุปกรณ์', 'Name')} ({tl.toUpperCase()})
              </span>
              <input
                className="inp"
                value={edit.name[tl]}
                autoFocus
                onChange={(e) =>
                  setEdit((x) => x && { ...x, name: { ...x.name, [tl]: e.target.value } })
                }
              />
            </label>
            <div className="f2">
              <label className="field">
                <span>{L('ค่าเช่าต่อวัน', 'Price per day')}</span>
                <span className="unit">
                  <input
                    className="inp num"
                    type="number"
                    min={0}
                    step={10}
                    value={edit.pricePerDay}
                    onChange={(e) =>
                      setEdit((x) => x && { ...x, pricePerDay: Number(e.target.value) })
                    }
                  />
                  <em>{L('บาท', 'THB')}</em>
                </span>
              </label>
              <label className="field">
                <span>{L('จำนวนในสต็อก', 'Stock')}</span>
                <span className="unit">
                  <input
                    className="inp num"
                    type="number"
                    min={0}
                    value={edit.stock}
                    onChange={(e) => setEdit((x) => x && { ...x, stock: Number(e.target.value) })}
                  />
                  <em>{L('ชิ้น', 'pcs')}</em>
                </span>
              </label>
            </div>
            <div className="acts">
              {edit.id &&
                canDelete &&
                (confirmDel ? (
                  <button
                    className="btn red"
                    type="button"
                    disabled={pending}
                    onClick={remove}
                    style={{ marginRight: 'auto' }}
                  >
                    <Icon name="trash" />
                    {L('ยืนยันลบ', 'Confirm delete')}
                  </button>
                ) : (
                  <button
                    className="btn t"
                    type="button"
                    onClick={() => setConfirmDel(true)}
                    style={{ marginRight: 'auto' }}
                  >
                    <Icon name="trash" />
                    {L('ลบ', 'Delete')}
                  </button>
                ))}
              <button className="btn o" type="button" onClick={() => setEdit(null)}>
                {L('ยกเลิก', 'Cancel')}
              </button>
              <button className="btn y" type="submit" disabled={pending}>
                <Icon name="check" />
                {L('บันทึก', 'Save')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
