'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { deleteProductAction, saveProductAction, type ProductInput } from '../actions/shop'
import type { MediaItem } from '../data'
import { money, slugify } from '../format'
import { pair, translator, type Lang } from '../i18n'
import { Icon } from '../icons'
import { BO } from '../nav'
import { isOneSize, PRODUCT_CAT_LABEL, PRODUCT_CATEGORIES, PRODUCT_ICON } from '../shop'
import { MediaPicker, useLibrary } from './MediaPicker'
import { Modal } from './Modal'
import { useToast } from './Toast'

type Loc = 'th' | 'en'
type Variant = ProductInput['variants'][number]

export function ProductEditor({
  lang,
  value,
  library,
  canDelete,
}: {
  lang: Lang
  value: ProductInput
  library: MediaItem[]
  canDelete: boolean
}) {
  const L = translator(lang)
  const toast = useToast()
  const router = useRouter()
  const [pending, start] = useTransition()
  const [v, setV] = useState(value)
  const [tl, setTl] = useState<Loc>(lang)
  const [picker, setPicker] = useState(false)
  const [confirm, setConfirm] = useState(false)
  // A new product's slug follows the English name until someone edits the slug itself
  const [slugAuto, setSlugAuto] = useState(!value.id && !value.slug)
  const media = useLibrary(library)
  const photos = v.images.map((id) => media.byId.get(id)).filter((m): m is MediaItem => !!m)
  const cover = photos[0]
  const en = tl === 'en'

  const patch = (p: Partial<ProductInput>) => setV((o) => ({ ...o, ...p }))
  const setLoc = (k: 'title' | 'description', text: string) =>
    setV((o) => ({
      ...o,
      [k]: { ...o[k], [tl]: text },
      ...(k === 'title' && tl === 'en' && slugAuto ? { slug: slugify(text) } : {}),
    }))
  const setRow = (i: number, p: Partial<Variant>) =>
    patch({ variants: v.variants.map((r, j) => (j === i ? { ...r, ...p } : r)) })
  const addRow = () => {
    const last = v.variants[v.variants.length - 1]
    patch({
      variants: [...v.variants, { id: null, sku: '', size: '', price: last?.price ?? 0, stock: 0 }],
    })
  }

  const save = () =>
    start(async () => {
      const r = await saveProductAction(v)
      toast(r.message, r.ok)
      if (r.ok && !v.id && r.redirect) router.replace(r.redirect)
    })
  const remove = () =>
    start(async () => {
      const r = await deleteProductAction(v.id!)
      toast(r.message, r.ok)
      if (r.ok) router.replace(`${BO}/shop`)
      else setConfirm(false)
    })

  const prices = v.variants.map((x) => Number(x.price) || 0)
  const minPrice = prices.length ? Math.min(...prices) : 0
  const fromPrice = prices.some((p) => p !== minPrice)
  const totalStock = v.variants.reduce((a, x) => a + (Number(x.stock) || 0), 0)
  const catLabel = v.category ? pair(lang, PRODUCT_CAT_LABEL[v.category]) : ''
  const heading =
    (lang === 'en' ? v.title.en || v.title.th : v.title.th || v.title.en) ||
    L('สินค้าใหม่', 'New product')
  const saveLabel = v.id ? L('บันทึกสินค้า', 'Save product') : L('เพิ่มสินค้า', 'Add product')

  return (
    <>
      <Link className="back" href={`${BO}/shop`}>
        <Icon name="back" />
        {L('ร้านค้า', 'Shop')}
      </Link>
      <div className="ph" style={{ marginTop: 4 }}>
        <div>
          <h1>{heading}</h1>
          <p className="lede">
            {L(
              'ชื่อ รายละเอียด ไซซ์ ราคา และสต็อก ดูตัวอย่างด้านขวาได้ทันที',
              'Name, details, sizes, prices and stock, with a live preview',
            )}
          </p>
        </div>
        <div className="acts">
          <Link className="btn o" href={`${BO}/shop`}>
            {L('ยกเลิก', 'Cancel')}
          </Link>
          <button className="btn y" type="button" disabled={pending} onClick={save}>
            <Icon name="check" />
            {saveLabel}
          </button>
        </div>
      </div>
      <div className="edit">
        <div className="forms">
          <section className="card fsec">
            <h3>
              <span className="no">1</span>
              {L('ข้อมูลพื้นฐาน', 'Basics')}
            </h3>
            <p className="hint">{L('หมวด แบรนด์ และลิงก์', 'Category, brand and link')}</p>
            <div className="f3">
              <label className="field">
                <span>{L('หมวด', 'Category')}</span>
                <select
                  className="inp"
                  value={v.category}
                  onChange={(e) => patch({ category: e.target.value as ProductInput['category'] })}
                >
                  <option value="">{L('ไม่ระบุ', 'None')}</option>
                  {PRODUCT_CATEGORIES.map((k) => (
                    <option key={k} value={k}>
                      {pair(lang, PRODUCT_CAT_LABEL[k])}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{L('แบรนด์', 'Brand')}</span>
                <input
                  className="inp"
                  value={v.brand}
                  placeholder="Mares, Scubapro…"
                  onChange={(e) => patch({ brand: e.target.value })}
                />
              </label>
              <label className="field">
                <span>{L('ชื่อในลิงก์ (slug)', 'URL slug')}</span>
                <input
                  className="inp"
                  value={v.slug}
                  placeholder={L('สร้างจากชื่ออังกฤษ', 'From the English name')}
                  onChange={(e) => {
                    setSlugAuto(false)
                    patch({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })
                  }}
                />
              </label>
            </div>
          </section>

          <section className="card fsec">
            <h3>
              <span className="no">2</span>
              {L('ชื่อและรายละเอียด', 'Name & description')}
            </h3>
            <p className="hint">
              {L(
                'กรอกทั้งภาษาไทยและอังกฤษ ลูกค้าจะเห็นตามภาษาที่เลือก',
                'Fill in Thai and English; customers see their language',
              )}
            </p>
            <div className="tabs" role="tablist">
              <button type="button" aria-pressed={tl === 'th'} onClick={() => setTl('th')}>
                ภาษาไทย
              </button>
              <button type="button" aria-pressed={tl === 'en'} onClick={() => setTl('en')}>
                English
              </button>
            </div>
            <label className="field">
              <span>
                {L('ชื่อสินค้า', 'Product name')} ({tl.toUpperCase()})
              </span>
              <input
                className="inp"
                value={v.title[tl]}
                onChange={(e) => setLoc('title', e.target.value)}
              />
            </label>
            <label className="field">
              <span>
                {L('รายละเอียด', 'Description')} ({tl.toUpperCase()})
              </span>
              <textarea
                className="inp"
                rows={5}
                value={v.description[tl]}
                onChange={(e) => setLoc('description', e.target.value)}
              />
            </label>
          </section>

          <section className="card fsec">
            <h3>
              <span className="no">3</span>
              {L('ไซซ์ ราคา และสต็อก', 'Sizes, prices & stock')}
            </h3>
            <p className="hint">
              {L(
                'หนึ่งแถวต่อหนึ่งไซซ์ · SKU ต้องไม่ซ้ำกับสินค้าอื่น',
                'One row per size · each SKU must be unique',
              )}
            </p>
            <div className="vtab" role="table" aria-label={L('ไซซ์', 'Sizes')}>
              <div className="vrow head" role="row">
                <span role="columnheader">SKU</span>
                <span role="columnheader">{L('ไซซ์', 'Size')}</span>
                <span role="columnheader">{L('ราคา (บาท)', 'Price (THB)')}</span>
                <span role="columnheader">{L('สต็อก', 'Stock')}</span>
                <span />
              </div>
              {v.variants.map((r, i) => (
                <div className="vrow" role="row" key={r.id ?? `n${i}`}>
                  <label>
                    <small>SKU</small>
                    <input
                      className="inp"
                      value={r.sku}
                      placeholder="MASK-M"
                      aria-label={`SKU ${i + 1}`}
                      onChange={(e) => setRow(i, { sku: e.target.value.toUpperCase() })}
                    />
                  </label>
                  <label>
                    <small>{L('ไซซ์', 'Size')}</small>
                    <input
                      className="inp"
                      value={r.size}
                      placeholder={L('M หรือ ฟรีไซซ์', 'M or Free size')}
                      aria-label={`${L('ไซซ์', 'Size')} ${i + 1}`}
                      onChange={(e) => setRow(i, { size: e.target.value })}
                    />
                  </label>
                  <label>
                    <small>{L('ราคา (บาท)', 'Price (THB)')}</small>
                    <input
                      className="inp num"
                      type="number"
                      min={0}
                      step={10}
                      value={r.price}
                      aria-label={`${L('ราคา', 'Price')} ${i + 1}`}
                      onChange={(e) => setRow(i, { price: Number(e.target.value) || 0 })}
                    />
                  </label>
                  <label>
                    <small>{L('สต็อก', 'Stock')}</small>
                    <input
                      className="inp num"
                      type="number"
                      min={0}
                      step={1}
                      value={r.stock}
                      aria-label={`${L('สต็อก', 'Stock')} ${i + 1}`}
                      onChange={(e) =>
                        setRow(i, { stock: Math.max(0, Math.round(Number(e.target.value) || 0)) })
                      }
                    />
                  </label>
                  <button
                    className="ibtn"
                    type="button"
                    aria-label={L('ลบไซซ์', 'Remove size')}
                    onClick={() => patch({ variants: v.variants.filter((_, j) => j !== i) })}
                  >
                    <Icon name="trash" />
                  </button>
                </div>
              ))}
              {v.variants.length === 0 && (
                <p className="muted small" style={{ padding: '12px 0' }}>
                  {L('ยังไม่มีไซซ์', 'No sizes yet')}
                </p>
              )}
            </div>
            <button className="btn g sm" type="button" style={{ marginTop: 12 }} onClick={addRow}>
              <Icon name="plus" />
              {L('เพิ่มไซซ์', 'Add size')}
            </button>
            <div className="calc">
              <span>
                {L('สต็อกรวม', 'Total stock')} <b className="num">{totalStock}</b>{' '}
                {L('ชิ้น', 'pcs')}
              </span>
              <span>
                {L('ราคาเริ่มต้น', 'From')} <b className="num">{money(minPrice)}</b>
              </span>
            </div>
          </section>

          <section className="card fsec">
            <h3>
              <span className="no">4</span>
              {L('รูปสินค้า', 'Photos')}
            </h3>
            <p className="hint">
              {L('แตะรูปเพื่อตั้งเป็นรูปหลัก', 'Tap a photo to make it the main photo')}
            </p>
            <div className="pgrid">
              {photos.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  className={i === 0 ? 'cv' : ''}
                  data-cv={L('รูปหลัก', 'Main')}
                  onClick={() => {
                    if (i === 0) return
                    patch({ images: [p.id, ...v.images.filter((x) => x !== p.id)] })
                    toast(L('ตั้งเป็นรูปหลักแล้ว', 'Main photo updated'))
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={p.alt} />
                </button>
              ))}
              <button className="up" type="button" onClick={() => setPicker(true)}>
                <span>
                  <Icon name="image" />
                  {L('เลือกหรืออัปโหลดรูป', 'Pick or upload')}
                </span>
              </button>
            </div>
          </section>

          <div className="savebar">
            {canDelete && v.id && (
              <button
                className="btn o lg"
                type="button"
                disabled={pending}
                onClick={() => setConfirm(true)}
              >
                <Icon name="trash" />
                {L('ลบสินค้า', 'Delete')}
              </button>
            )}
            <button className="btn y lg" type="button" disabled={pending} onClick={save}>
              <Icon name="check" />
              {saveLabel}
            </button>
          </div>
        </div>

        <aside className="prev">
          <p className="lab">
            <Icon name="eye" />
            {L('ตัวอย่างบนเว็บไซต์', 'Website preview')} · {tl.toUpperCase()}
          </p>
          <div className="webcard">
            <div className="im">
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover.url} alt={cover.alt} />
              ) : (
                <span className="noimg" style={{ position: 'absolute', inset: 0 }}>
                  <Icon name={PRODUCT_ICON[v.category] ?? 'bag'} />
                </span>
              )}
              {v.category && (
                <span className="bdg">{PRODUCT_CAT_LABEL[v.category][en ? 1 : 0]}</span>
              )}
            </div>
            <div className="bd">
              <span className="pl">
                {v.brand || catLabel || (en ? 'Dive gear' : 'อุปกรณ์ดำน้ำ')}
              </span>
              <h4>{v.title[tl] || v.title.th || (en ? 'Untitled' : 'ยังไม่มีชื่อ')}</h4>
              {v.description[tl] && <p className="s clamp3">{v.description[tl]}</p>}
              {v.variants.length > 0 && (
                <div className="wsz">
                  {v.variants.map((x, i) => (
                    <span key={x.id ?? `s${i}`} className={x.stock > 0 ? '' : 'out'}>
                      {isOneSize(x.size) ? (en ? 'One size' : 'ฟรีไซซ์') : x.size}
                    </span>
                  ))}
                </div>
              )}
              <div className="pr">
                <span>
                  {fromPrice && <small>{en ? 'From' : 'เริ่มต้น'}</small>}
                  <b className="num">{money(minPrice)}</b>
                  <small>
                    {totalStock > 0
                      ? en
                        ? 'In stock'
                        : 'มีสินค้า'
                      : en
                        ? 'Out of stock'
                        : 'สินค้าหมด'}
                  </small>
                </span>
                <span className="wbtn">{en ? 'Add to bag' : 'ใส่ตะกร้า'}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {picker && (
        <MediaPicker
          lang={lang}
          multiple
          library={media.lib}
          onUploaded={media.add}
          selected={v.images}
          onChange={(images) => patch({ images })}
          onClose={() => setPicker(false)}
          title={L('รูปสินค้า', 'Product photos')}
          hint={L(
            'แตะเพื่อเพิ่มหรือเอาออก รูปแรกคือรูปหลัก',
            'Tap to add or remove; the first photo is the main one',
          )}
        />
      )}

      {confirm && (
        <Modal onClose={() => setConfirm(false)} label={L('ลบสินค้า', 'Delete product')}>
          <h3>{L('ลบสินค้านี้?', 'Delete this product?')}</h3>
          <p className="s">
            {L(
              `"${heading}" และไซซ์ทั้งหมด ${v.variants.length} รายการจะถูกลบถาวร`,
              `"${heading}" and its ${v.variants.length} sizes will be deleted for good.`,
            )}
          </p>
          <div className="acts">
            <button className="btn o" type="button" onClick={() => setConfirm(false)}>
              {L('ยกเลิก', 'Cancel')}
            </button>
            <button className="btn o red" type="button" disabled={pending} onClick={remove}>
              <Icon name="trash" />
              {L('ลบถาวร', 'Delete')}
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
