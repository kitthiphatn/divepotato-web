'use client'

import Link from 'next/link'
import { useMemo, useState, useSyncExternalStore, useTransition } from 'react'

import {
  approveOrderSlipAction,
  cancelOrderAction,
  rejectOrderSlipAction,
  setOrderStatusAction,
  setTrackingAction,
} from '../actions/orders'
import { paidOf, type OrderVM } from '../data'
import { fd, initials, money, shopTime, ymd } from '../format'
import { KIND_LABEL, ORDER_STATUS_CLASS, ORDER_STATUS_LABEL, pair, PROVIDER_LABEL, translator, type Lang } from '../i18n'
import { Icon } from '../icons'
import { BO } from '../nav'
import type { ActionResult } from '../server'
import { isOneSize } from '../shop'
import { PayVia, payIcon, SlipBox, SlipCheck } from './Bookings'
import { SubTabs } from './fields'
import { Modal } from './Modal'
import { useToast } from './Toast'

type Tr = ReturnType<typeof translator>
type ModalKind = null | 'reject' | 'ship' | 'cancel' | 'slip'

// Work first: slips to review, paid orders to pack, packed orders to hand over
const ORDER: Record<string, number> = {
  pending_review: 0,
  paid: 1,
  packed: 2,
  pending_payment: 3,
  shipped: 4,
  picked_up: 4,
  cancelled: 5,
  refunded: 5,
  expired: 6,
}
const CHIPS = [
  ['review', ['pending_review']],
  ['topack', ['paid']],
  ['packed', ['packed']],
  ['waiting', ['pending_payment']],
  ['done', ['shipped', 'picked_up']],
  ['cancelled', ['cancelled', 'refunded']],
  ['expired', ['expired']],
] as const
const chipMatch = (chip: string, status: string) =>
  chip === 'all' || CHIPS.some(([k, sts]) => k === chip && (sts as readonly string[]).includes(status))

const minuteNow = () => Math.floor(Date.now() / 60000)
const subscribeMinute = (cb: () => void) => {
  const t = setInterval(cb, 15000)
  return () => clearInterval(t)
}
const useMinute = () => useSyncExternalStore(subscribeMinute, minuteNow, () => null)

function OrderPill({ status, lang }: { status: string; lang: Lang }) {
  return (
    <span className={`pill ${ORDER_STATUS_CLASS[status] ?? 'st-hold'}`}>
      {pair(lang, ORDER_STATUS_LABEL[status], status)}
    </span>
  )
}

const itemCount = (o: OrderVM) => o.items.reduce((n, it) => n + it.qty, 0)
const sizeOf = (s: string, L: Tr) => (isOneSize(s) ? L('ฟรีไซซ์', 'One size') : s)

function eventText(e: { event: string; note: string }, L: Tr, lang: Lang) {
  const st = (k: string) => pair(lang, ORDER_STATUS_LABEL[k], k)
  let m = /^created \((\w+)\)$/.exec(e.event)
  let text: string
  if (m) text = `${L('สร้างคำสั่งซื้อ', 'Order created')} · ${st(m[1])}`
  else if ((m = /^status: (\w+) → (\w+)$/.exec(e.event)))
    text = `${L('สถานะ', 'Status')}: ${st(m[1])} → ${st(m[2])}`
  else
    text =
      {
        'website order': L('สั่งซื้อผ่านเว็บไซต์', 'Website order'),
        'slip uploaded': L('ลูกค้าส่งสลิป', 'Customer sent a slip'),
        'slip approved': L('อนุมัติสลิป', 'Slip approved'),
        'slip rejected': L('ปฏิเสธสลิป', 'Slip rejected'),
        'payment received': L('รับชำระออนไลน์', 'Online payment received'),
        'payment failed': L('ชำระออนไลน์ไม่สำเร็จ', 'Online payment failed'),
        'payment mismatch': L('ยอดไม่ตรงกับคำสั่งซื้อ ตรวจสอบด่วน', 'Payment does not match the order, check it'),
        'check payment amount': L('ยอดชำระไม่ครบ ตรวจสอบ', 'Paid less than the total, check'),
        'check duplicate payment': L('อาจชำระซ้ำ ตรวจสอบ', 'Possible duplicate payment, check'),
        'paid after hold expired': L('ชำระหลังหมดเวลาจองสินค้า', 'Paid after the hold expired'),
        'refund needed': L('ต้องคืนเงินลูกค้า', 'Refund needed'),
        'tracking number': L('เลขพัสดุ', 'Tracking number'),
        cancelled: L('ยกเลิกคำสั่งซื้อ', 'Order cancelled'),
      }[e.event] ?? e.event
  return e.note ? `${text} · ${e.note}` : text
}

export type OrdersProps = {
  lang: Lang
  orders: OrderVM[]
  tabs: { href: string; label: string; icon: string; on: boolean }[]
  initial: { open: number | null; status: string }
}

// Orders screen of the Shop section: status chips, search, and the order panel with slip
// review, packing and hand-over, tracking number and cancel/refund
export function OrdersClient({ lang, orders, tabs, initial }: OrdersProps) {
  const L = translator(lang)
  const toast = useToast()
  const [pending, start] = useTransition()
  const [q, setQ] = useState('')
  const [chip, setChip] = useState(initial.status)
  const [openId, setOpenId] = useState<number | null>(initial.open)
  const [menu, setMenu] = useState(false)
  const [modal, setModal] = useState<ModalKind>(null)
  const minute = useMinute()
  const open = orders.find((o) => o.id === openId) ?? null

  const setUrl = (id: number | null) => {
    const url = new URL(window.location.href)
    if (id) url.searchParams.set('open', String(id))
    else url.searchParams.delete('open')
    window.history.replaceState(null, '', url.pathname + url.search)
  }
  const openDrawer = (id: number) => {
    setOpenId(id)
    setMenu(false)
    setUrl(id)
  }
  const closeDrawer = () => {
    setOpenId(null)
    setMenu(false)
    setUrl(null)
  }
  const act = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      const r = await fn()
      toast(r.message, r.ok)
      if (r.ok) {
        setModal(null)
        setMenu(false)
      }
    })

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length }
    for (const [k] of CHIPS) c[k] = orders.filter((o) => chipMatch(k, o.status)).length
    return c
  }, [orders])

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return orders
      .filter((o) => chipMatch(chip, o.status))
      .filter(
        (o) =>
          !s ||
          [o.code, o.customer?.name, o.customer?.phone, o.trackingNo, ...o.items.map((it) => it.title)]
            .join(' ')
            .toLowerCase()
            .includes(s),
      )
      .sort((a, b) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9) || b.createdAt.localeCompare(a.createdAt))
  }, [orders, chip, q])

  const chipLabel: Record<string, string> = {
    review: L('รอตรวจสลิป', 'Slip to review'),
    topack: L('รอแพ็ก', 'To pack'),
    packed: L('แพ็กแล้ว', 'Packed'),
    waiting: L('รอชำระ', 'Awaiting payment'),
    done: L('ส่งมอบแล้ว', 'Handed over'),
    cancelled: L('ยกเลิก/คืนเงิน', 'Cancelled'),
    expired: L('หมดเวลา', 'Expired'),
  }

  return (
    <>
      <div className="ph">
        <div>
          <h1>{L('ร้านค้า', 'Shop')}</h1>
          <p className="lede">
            {L('คำสั่งซื้อจากหน้าเว็บ ตรวจสลิป แพ็ก และจัดส่ง', 'Website orders: review slips, pack and ship')}
          </p>
        </div>
      </div>
      <SubTabs items={tabs} />
      <div className="toolbar">
        <label className="search">
          <Icon name="search" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={L('ค้นหา เช่น DP-ORD หรือชื่อ เบอร์โทร', 'Search e.g. DP-ORD, name or phone')}
            aria-label={L('ค้นหา', 'Search')}
          />
        </label>
      </div>
      <div className="chips" role="group">
        <button type="button" aria-pressed={chip === 'all'} onClick={() => setChip('all')}>
          {L('ทั้งหมด', 'All')} <sup className="num">{counts.all}</sup>
        </button>
        {CHIPS.filter(([k]) => k !== 'expired' || counts.expired > 0).map(([k]) => (
          <button key={k} type="button" aria-pressed={chip === k} onClick={() => setChip(k)}>
            {chipLabel[k]} <sup className="num">{counts[k]}</sup>
          </button>
        ))}
      </div>
      <div className="card p0">
        <div className="rows">
          <div className="row head">
            <span>{L('ลูกค้า', 'Customer')}</span>
            <span>{L('สินค้า / วันที่', 'Items / date')}</span>
            <span className="pxc">{L('การรับ', 'Delivery')}</span>
            <span>{L('ยอดเงิน', 'Amount')}</span>
            <span>{L('สถานะ', 'Status')}</span>
            <span />
          </div>
          {list.length ? (
            list.map((o) => (
              <button key={o.id} type="button" className="row" onClick={() => openDrawer(o.id)}>
                <span className="who">
                  <span className="av">{initials(o.customer?.name)}</span>
                  <span style={{ minWidth: 0 }}>
                    <b>{o.customer?.name ?? L('ลูกค้า', 'Customer')}</b>
                    <small className="num">{o.code}</small>
                  </span>
                </span>
                <span className="c2">
                  <b>
                    {o.items[0]?.title ?? '-'}
                    {o.items.length > 1 ? ` +${o.items.length - 1}` : ''}
                  </b>
                  <small>
                    {itemCount(o)} {L('ชิ้น', 'pcs')} · {fd(ymd(o.createdAt), lang)} {shopTime(o.createdAt)}
                  </small>
                </span>
                <span className="pxc muted">{o.delivery === 'ship' ? L('ส่งไปรษณีย์', 'Post') : L('รับที่ร้าน', 'Pickup')}</span>
                <span className="amt num">
                  <b>{money(o.total)}</b>
                </span>
                <span className="st">
                  <OrderPill status={o.status} lang={lang} />
                </span>
                <span className="chev">
                  <Icon name="chev" />
                </span>
              </button>
            ))
          ) : (
            <div className="empty">
              {orders.length
                ? L('ไม่พบคำสั่งซื้อที่ตรงกับคำค้นหา', 'No orders match your search')
                : L('ยังไม่มีคำสั่งซื้อ', 'No orders yet')}
            </div>
          )}
        </div>
      </div>

      <div className={`scrim${open ? ' on' : ''}`} onClick={closeDrawer} />
      <aside
        className={`drawer${open ? ' on' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={L('คำสั่งซื้อ', 'Order')}
        aria-hidden={!open}
      >
        {open && (
          <Drawer
            o={open}
            lang={lang}
            L={L}
            minute={minute}
            menu={menu}
            setMenu={setMenu}
            pending={pending}
            onClose={closeDrawer}
            onModal={setModal}
            act={act}
          />
        )}
      </aside>

      {modal === 'reject' && open && (
        <RejectModal L={L} pending={pending} onClose={() => setModal(null)} onSave={(r) => act(() => rejectOrderSlipAction(open.id, r))} />
      )}
      {modal === 'ship' && open && (
        <ShipModal
          o={open}
          L={L}
          pending={pending}
          onClose={() => setModal(null)}
          onSave={(trackingNo) => act(() => setOrderStatusAction({ orderId: open.id, status: 'shipped', trackingNo }))}
        />
      )}
      {modal === 'cancel' && open && (
        <CancelModal
          o={open}
          L={L}
          pending={pending}
          onClose={() => setModal(null)}
          onSave={(v) => act(() => cancelOrderAction({ orderId: open.id, ...v }))}
        />
      )}
      {modal === 'slip' && open && (
        <div className="lbox" onClick={() => setModal(null)}>
          <button className="ibtn" type="button" onClick={() => setModal(null)} aria-label={L('ปิด', 'Close')}>
            <Icon name="x" />
          </button>
          {(() => {
            const p =
              open.payments.find((x) => x.status === 'pending' && x.provider === 'slip' && x.slip) ??
              open.payments.find((x) => x.slip)
            return p?.slip ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.slip.url} alt={p.slip.alt || L('สลิป', 'Slip')} />
            ) : null
          })()}
        </div>
      )}
    </>
  )
}

function Drawer({
  o,
  lang,
  L,
  minute,
  menu,
  setMenu,
  pending,
  onClose,
  onModal,
  act,
}: {
  o: OrderVM
  lang: Lang
  L: Tr
  minute: number | null
  menu: boolean
  setMenu: (v: boolean) => void
  pending: boolean
  onClose: () => void
  onModal: (m: ModalKind) => void
  act: (fn: () => Promise<ActionResult>) => void
}) {
  const [tracking, setTracking] = useState(o.trackingNo)
  const paid = paidOf(o)
  const ship = o.delivery === 'ship'
  const slip = o.payments.find((p) => p.status === 'pending' && p.provider === 'slip') ?? null
  const shown = o.payments.filter((p) => p !== slip)
  const closed = ['cancelled', 'refunded', 'expired'].includes(o.status)
  const holdLeft =
    o.status === 'pending_payment' && o.holdExpiresAt && minute !== null
      ? Math.floor(Date.parse(o.holdExpiresAt) / 60000) - minute
      : null

  const primary: { label: string; icon: string; onClick: () => void } | null =
    o.status === 'pending_review'
      ? { label: L('อนุมัติสลิป', 'Approve slip'), icon: 'check', onClick: () => act(() => approveOrderSlipAction(o.id)) }
      : o.status === 'paid'
        ? {
            label: L('แพ็กเรียบร้อย', 'Mark packed'),
            icon: 'check',
            onClick: () => act(() => setOrderStatusAction({ orderId: o.id, status: 'packed' })),
          }
        : o.status === 'packed'
          ? ship
            ? { label: L('จัดส่งแล้ว · ใส่เลขพัสดุ', 'Mark shipped · tracking'), icon: 'boat', onClick: () => onModal('ship') }
            : {
                label: L('ลูกค้ารับสินค้าแล้ว', 'Mark picked up'),
                icon: 'check',
                onClick: () => act(() => setOrderStatusAction({ orderId: o.id, status: 'picked_up' })),
              }
          : null

  return (
    <>
      <div className="dh">
        <span className="code num">{o.code}</span>
        <span className="tagc">{ship ? L('ส่งไปรษณีย์', 'Ship by post') : L('รับที่ร้าน', 'Pick up')}</span>
        <button className="ibtn" type="button" onClick={onClose} aria-label={L('ปิด', 'Close')}>
          <Icon name="x" />
        </button>
      </div>
      <div className="db">
        <div className="dtitle">
          <h2>{o.customer?.name ?? L('ลูกค้า', 'Customer')}</h2>
          <p>
            {itemCount(o)} {L('ชิ้น', 'pcs')} · {money(o.total)} · {fd(ymd(o.createdAt), lang)} {shopTime(o.createdAt)}
          </p>
          <OrderPill status={o.status} lang={lang} />
          {holdLeft !== null && (
            <span className="small muted" style={{ marginLeft: 6 }}>
              <Icon name="clock" />{' '}
              {holdLeft > 0
                ? L(`ปล่อยสินค้าคืนใน ${holdLeft} นาที`, `Items release in ${holdLeft} min`)
                : L('หมดเวลาจองสินค้าแล้ว', 'The hold has run out')}
            </span>
          )}
        </div>
        {closed && (
          <div className={`banner ${o.status === 'expired' ? 'amb' : 'red'}`}>
            <Icon name={o.status === 'expired' ? 'clock' : 'alert'} />
            <span>
              {o.status === 'expired'
                ? L('หมดเวลาชำระเงิน สินค้าถูกปล่อยคืนแล้ว', 'Payment time ran out; the items were released')
                : o.status === 'refunded'
                  ? L('ยกเลิกและคืนเงินแล้ว', 'Cancelled and refunded')
                  : L('คำสั่งซื้อนี้ถูกยกเลิกแล้ว', 'This order was cancelled')}
            </span>
          </div>
        )}

        {slip && (
          <div className="dsec">
            <h3>{L('สลิปที่ลูกค้าส่งมา', 'Slip from customer')}</h3>
            <div className="reviewbox">
              <button
                type="button"
                className="slipwrap"
                onClick={() => slip.slip && onModal('slip')}
                aria-label={L('ดูสลิปขนาดใหญ่', 'View slip larger')}
                style={slip.slip ? undefined : { cursor: 'default' }}
              >
                <SlipBox p={slip} L={L} />
              </button>
              <div>
                <h4>
                  {pair(lang, KIND_LABEL[slip.kind])} {money(slip.amount)}
                </h4>
                <p className="small muted">
                  {L('ส่งเมื่อ ', 'Sent ')}
                  {fd(ymd(slip.at), lang)} {shopTime(slip.at)} · {pair(lang, PROVIDER_LABEL[slip.provider], slip.provider)}
                </p>
                <SlipCheck p={slip} L={L} />
                <ul className="checks">
                  <li className={slip.amount === o.total ? '' : 'warn'}>
                    <Icon name={slip.amount === o.total ? 'check' : 'alert'} />
                    <span>
                      {slip.amount === o.total
                        ? L(`ยอดตรงกับคำสั่งซื้อ ${money(o.total)}`, `Amount matches the ${money(o.total)} order`)
                        : L(`ยอดไม่ตรงกับคำสั่งซื้อ ${money(o.total)}`, `Amount differs from the ${money(o.total)} order`)}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="dsec">
          <h3>{L('สินค้า', 'Items')}</h3>
          <ul className="oitems">
            {o.items.map((it, i) => (
              <li key={i}>
                <span>
                  <b>{it.title}</b>
                  <small className="muted">
                    {[it.size && sizeOf(it.size, L), it.sku].filter(Boolean).join(' · ')} · {money(it.unitPrice)} × {it.qty}
                  </small>
                </span>
                <b className="num">{money(it.lineTotal)}</b>
              </li>
            ))}
          </ul>
          <div className="money num">
            <div>
              <span>{L('ค่าสินค้า', 'Subtotal')}</span>
              <b>{money(o.subtotal)}</b>
            </div>
            <div>
              <span>{L('ค่าส่ง', 'Shipping')}</span>
              <b>{money(o.shippingFee)}</b>
            </div>
            <div>
              <span>{L('ยอดรวม', 'Total')}</span>
              <b>{money(o.total)}</b>
            </div>
          </div>
          <p className="small muted" style={{ marginTop: 8 }}>
            {o.stockDeducted
              ? L('ตัดสต็อกแล้ว', 'Stock taken off')
              : o.status === 'pending_payment' || o.status === 'pending_review'
                ? L('จองสต็อกไว้ ยังไม่ตัด', 'Stock reserved, not taken yet')
                : L('ไม่ได้ตัดสต็อก', 'No stock taken')}
          </p>
        </div>

        <div className="dsec">
          <h3>{L('การรับสินค้า', 'Delivery')}</h3>
          <dl className="kv">
            <dt>{L('วิธีรับ', 'Method')}</dt>
            <dd>{ship ? L('ส่งไปรษณีย์', 'Ship by post') : L('รับที่ร้าน', 'Pick up at shop')}</dd>
            {ship && (
              <>
                <dt>{L('ที่อยู่', 'Address')}</dt>
                <dd>{o.address || '—'}</dd>
              </>
            )}
          </dl>
          {ship && !closed && (
            <div className="trk">
              <label className="field">
                <span>{L('เลขพัสดุ', 'Tracking number')}</span>
                <input className="inp num" value={tracking} maxLength={60} onChange={(e) => setTracking(e.target.value)} />
              </label>
              <button
                className="btn o"
                type="button"
                disabled={pending || tracking.trim() === o.trackingNo}
                onClick={() => act(() => setTrackingAction(o.id, tracking))}
              >
                {L('บันทึก', 'Save')}
              </button>
            </div>
          )}
          {ship && closed && o.trackingNo && (
            <p className="small">
              {L('เลขพัสดุ', 'Tracking')} <b className="num">{o.trackingNo}</b>
            </p>
          )}
        </div>

        <div className="dsec">
          <h3>{L('การชำระเงิน', 'Payments')}</h3>
          <div className="money num">
            <div>
              <span>{L('ยอดรวม', 'Total')}</span>
              <b>{money(o.total)}</b>
            </div>
            <div>
              <span>{L('จ่ายแล้ว', 'Paid')}</span>
              <b>{money(paid)}</b>
            </div>
            <div>
              <span>{L('คงเหลือ', 'Due')}</span>
              <b className={!closed && o.total - paid > 0 ? 'due' : ''}>{money(Math.max(0, o.total - paid))}</b>
            </div>
          </div>
          <div style={{ marginTop: 6 }}>
            {shown.length === 0 && (
              <p className="muted small" style={{ padding: '8px 0' }}>
                {L('ยังไม่มีการชำระเงิน', 'No payments yet')}
              </p>
            )}
            {shown.map((p) => (
              <div className="pay" key={p.id}>
                <span className="slipth" style={{ display: 'grid', placeItems: 'center', color: 'var(--mu)' }}>
                  {p.slip ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.slip.url} alt={p.slip.alt} />
                  ) : (
                    <Icon name={payIcon(p)} />
                  )}
                </span>
                <span className="tx">
                  <b>{pair(lang, KIND_LABEL[p.kind], p.kind)}</b>
                  <span>
                    {fd(ymd(p.at), lang)} · <PayVia p={p} lang={lang} />
                    {p.ref ? ` · ${p.ref}` : ''}
                  </span>
                </span>
                <span style={{ textAlign: 'right' }}>
                  <span className="am num">{money(p.amount)}</span>
                  <br />
                  {p.kind === 'refund' && p.status === 'succeeded' ? (
                    <span className="pill st-cancelled">{L('คืนเงินแล้ว', 'Refunded')}</span>
                  ) : p.status === 'succeeded' ? (
                    <span className="pill st-paid">{L('ยืนยันแล้ว', 'Confirmed')}</span>
                  ) : p.status === 'rejected' ? (
                    <span className="pill st-cancelled">{L('ปฏิเสธแล้ว', 'Rejected')}</span>
                  ) : p.status === 'pending' ? (
                    <span className="pill st-review">{L('รอผลชำระ', 'Awaiting payment')}</span>
                  ) : (
                    <span className="pill st-hold">{L('ไม่สำเร็จ', 'Failed')}</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>

        {o.customer && (
          <div className="dsec">
            <h3>
              {L('ลูกค้า', 'Customer')}{' '}
              <Link className="link" href={`${BO}/customers/${o.customer.id}`}>
                {L('ดูโปรไฟล์', 'Profile')}
                <Icon name="chev" />
              </Link>
            </h3>
            <dl className="kv">
              <dt>{L('โทร', 'Phone')}</dt>
              <dd className="num">{o.customer.phone || '—'}</dd>
              <dt>{L('อีเมล', 'Email')}</dt>
              <dd>{o.customer.email || '—'}</dd>
            </dl>
          </div>
        )}

        <div className="dsec">
          <h3>{L('ประวัติ', 'History')}</h3>
          <ul className="tl2">
            {[...o.timeline].reverse().map((t, i) => (
              <li key={i}>
                {eventText(t, L, lang)}
                <span>
                  {fd(ymd(t.at), lang)} {shopTime(t.at)}
                  {t.by ? ` · ${t.by}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="df">
        {primary ? (
          <button className="btn y lg" type="button" disabled={pending} onClick={primary.onClick}>
            <Icon name={primary.icon} />
            {primary.label}
          </button>
        ) : (
          <span className="dfnote">
            {o.status === 'pending_payment'
              ? L('รอลูกค้าชำระเงิน', 'Waiting for the customer to pay')
              : o.status === 'shipped' || o.status === 'picked_up'
                ? L('ส่งมอบสินค้าแล้ว', 'Handed over')
                : L('คำสั่งซื้อนี้ปิดแล้ว', 'This order is closed')}
          </span>
        )}
        <button
          className="btn o lg"
          type="button"
          onClick={() => setMenu(!menu)}
          aria-label={L('ตัวเลือกเพิ่มเติม', 'More actions')}
          aria-expanded={menu}
          style={{ padding: '0 18px' }}
        >
          <Icon name="more" />
        </button>
        <div className="menu" hidden={!menu}>
          {o.status === 'pending_review' && (
            <button type="button" onClick={() => onModal('reject')}>
              <Icon name="x" />
              {L('ปฏิเสธสลิป', 'Reject slip')}
            </button>
          )}
          {o.status === 'paid' && ship && (
            <button type="button" onClick={() => onModal('ship')}>
              <Icon name="boat" />
              {L('จัดส่งเลย · ใส่เลขพัสดุ', 'Ship now · tracking')}
            </button>
          )}
          {o.status === 'paid' && !ship && (
            <button type="button" onClick={() => act(() => setOrderStatusAction({ orderId: o.id, status: 'picked_up' }))}>
              <Icon name="check" />
              {L('ลูกค้ารับสินค้าแล้ว', 'Mark picked up')}
            </button>
          )}
          {!closed && (
            <>
              <hr />
              <button className="red" type="button" onClick={() => onModal('cancel')}>
                <Icon name="refund" />
                {L('ยกเลิก / คืนเงิน', 'Cancel / refund')}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}

function RejectModal({
  L,
  pending,
  onClose,
  onSave,
}: {
  L: Tr
  pending: boolean
  onClose: () => void
  onSave: (reason: string) => void
}) {
  const reasons = [
    L('ยอดเงินไม่ตรง', 'Amount does not match'),
    L('สลิปไม่ชัด', 'Slip is unclear'),
    L('ไม่พบยอดเข้าบัญชี', 'Payment not received'),
  ]
  const [reason, setReason] = useState(reasons[0])
  return (
    <Modal onClose={onClose} label={L('ปฏิเสธสลิป', 'Reject slip')}>
      <h3>{L('ปฏิเสธสลิป?', 'Reject this slip?')}</h3>
      <p className="s">
        {L(
          'คำสั่งซื้อจะกลับไปเป็น "รอชำระเงิน" และจองสินค้าไว้ให้ลูกค้าชำระใหม่',
          'The order goes back to awaiting payment, with the items held for a new payment',
        )}
      </p>
      <label className="field">
        <span>{L('เหตุผล', 'Reason')}</span>
        <select className="inp" value={reason} onChange={(e) => setReason(e.target.value)}>
          {reasons.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </label>
      <div className="acts">
        <button className="btn o" type="button" onClick={onClose}>
          {L('ยกเลิก', 'Back')}
        </button>
        <button className="btn k" type="button" disabled={pending} onClick={() => onSave(reason)}>
          {L('ปฏิเสธสลิป', 'Reject slip')}
        </button>
      </div>
    </Modal>
  )
}

function ShipModal({
  o,
  L,
  pending,
  onClose,
  onSave,
}: {
  o: OrderVM
  L: Tr
  pending: boolean
  onClose: () => void
  onSave: (trackingNo: string) => void
}) {
  const [no, setNo] = useState(o.trackingNo)
  return (
    <Modal onClose={onClose} label={L('จัดส่งสินค้า', 'Ship order')}>
      <h3>{L('จัดส่งสินค้า', 'Ship the order')}</h3>
      <p className="s">
        {o.code} · {o.customer?.name}
        <br />
        {o.address}
      </p>
      <label className="field">
        <span>{L('เลขพัสดุ', 'Tracking number')}</span>
        <input className="inp num" value={no} maxLength={60} onChange={(e) => setNo(e.target.value)} autoFocus />
      </label>
      <div className="acts">
        <button className="btn o" type="button" onClick={onClose}>
          {L('ยกเลิก', 'Cancel')}
        </button>
        <button className="btn y" type="button" disabled={pending || !no.trim()} onClick={() => onSave(no)}>
          {L('ยืนยันจัดส่ง', 'Confirm shipped')}
        </button>
      </div>
    </Modal>
  )
}

function CancelModal({
  o,
  L,
  pending,
  onClose,
  onSave,
}: {
  o: OrderVM
  L: Tr
  pending: boolean
  onClose: () => void
  onSave: (v: { refund: number; note: string }) => void
}) {
  const paid = paidOf(o)
  const [refund, setRefund] = useState(String(paid))
  const [note, setNote] = useState('')
  const gone = o.status === 'shipped' || o.status === 'picked_up'
  return (
    <Modal onClose={onClose} label={L('ยกเลิกคำสั่งซื้อ', 'Cancel order')}>
      <h3>{L('ยกเลิกคำสั่งซื้อนี้?', 'Cancel this order?')}</h3>
      <p className="s">
        {o.code} · {o.customer?.name}
      </p>
      <div className="banner amb" style={{ marginTop: 16 }}>
        <Icon name="alert" />
        <span>
          {gone
            ? L('สินค้าส่งมอบไปแล้ว ระบบจะไม่คืนสต็อกให้ ปรับสต็อกเองถ้าได้สินค้าคืน', 'The items already left the shop; stock is not put back. Adjust stock by hand if they come back.')
            : o.stockDeducted
              ? L('สินค้าจะถูกคืนเข้าสต็อก', 'The items go back into stock')
              : L('ปล่อยสินค้าที่จองไว้คืน', 'The reserved items are released')}
        </span>
      </div>
      <label className="field">
        <span>
          {L('ยอดคืนเงิน (บาท)', 'Refund (THB)')} · {L('รับมาแล้ว', 'paid')} {money(paid)}
        </span>
        <input className="inp num" inputMode="numeric" value={refund} onChange={(e) => setRefund(e.target.value.replace(/[^\d]/g, ''))} />
      </label>
      <label className="field">
        <span>{L('หมายเหตุ', 'Note')}</span>
        <textarea
          className="inp"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={L('เช่น ลูกค้าเปลี่ยนใจ ไซซ์ไม่พอดี', 'e.g. customer changed their mind')}
        />
      </label>
      <div className="acts">
        <button className="btn o" type="button" onClick={onClose}>
          {L('ไม่ยกเลิก', 'Keep order')}
        </button>
        <button className="btn k" type="button" disabled={pending} onClick={() => onSave({ refund: Number(refund) || 0, note })}>
          {L('ยืนยันยกเลิก', 'Confirm cancel')}
        </button>
      </div>
    </Modal>
  )
}
