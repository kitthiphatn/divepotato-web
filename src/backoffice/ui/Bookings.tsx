'use client'

import Link from 'next/link'
import { useMemo, useState, useSyncExternalStore, useTransition } from 'react'

import {
  approveSlipAction,
  cancelBookingAction,
  completeBookingAction,
  createBookingAction,
  recordPaymentAction,
  rejectSlipAction,
} from '../actions/bookings'
import {
  dueOf,
  paidOf,
  type BookingVM,
  type CustomerOption,
  type DepartureVM,
  type PaymentVM,
} from '../data'
import { addDays, diffDays, fd, fdy, frange, initials, money, shopTime, ymd } from '../format'
import {
  CERT_LABEL,
  KIND_LABEL,
  METHOD_LABEL,
  pair,
  PROVIDER_LABEL,
  SOURCE_LABEL,
  STATUS_LABEL,
  STEPS,
  translator,
  type Lang,
} from '../i18n'
import { Icon } from '../icons'
import { BO } from '../nav'
import type { ActionResult } from '../server'
import { StatusPill } from './bits'
import { SubTabs } from './fields'
import { Modal, Soon } from './Modal'
import { useToast } from './Toast'

type Tr = ReturnType<typeof translator>

const ORDER: Record<string, number> = {
  pending_review: 0,
  hold: 1,
  deposit_paid: 2,
  paid: 3,
  completed: 4,
  cancelled: 5,
  refunded: 5,
  expired: 6,
}
// Status chips; "cancelled" also covers refunded bookings
const CHIPS = [
  ['review', 'pending_review'],
  ['hold', 'hold'],
  ['deposit', 'deposit_paid'],
  ['paid', 'paid'],
  ['done', 'completed'],
  ['cancelled', 'cancelled'],
  ['expired', 'expired'],
] as const
const chipMatch = (chip: string, status: string) =>
  chip === 'all' ||
  CHIPS.some(
    ([k, st]) => k === chip && (st === status || (k === 'cancelled' && status === 'refunded')),
  )

const minuteNow = () => Math.floor(Date.now() / 60000)
const subscribeMinute = (cb: () => void) => {
  const t = setInterval(cb, 15000)
  return () => clearInterval(t)
}
// Current minute on the client; null while rendering on the server
const useMinute = () => useSyncExternalStore(subscribeMinute, minuteNow, () => null)

export function BookingRow({ b, lang, onOpen }: { b: BookingVM; lang: Lang; onOpen?: () => void }) {
  const L = translator(lang)
  const due = dueOf(b)
  const inner = (
    <>
      <span className="who">
        <span className="av">{initials(b.customer?.name)}</span>
        <span style={{ minWidth: 0 }}>
          <b>{b.customer?.name ?? L('ลูกค้า', 'Customer')}</b>
          <small className="num">{b.code}</small>
        </span>
      </span>
      <span className="c2">
        <b>{b.departure?.name ?? '-'}</b>
        <small>{b.departure ? frange(b.departure.start, b.departure.end, lang) : ''}</small>
      </span>
      <span className="pxc muted num">
        {b.participants.length} {L('คน', 'pax')}
      </span>
      <span className="amt num">
        <b>{money(b.total)}</b>
        <small>
          {b.status === 'refunded'
            ? L('คืนเงินแล้ว', 'Refunded')
            : ['cancelled', 'expired'].includes(b.status)
              ? pair(lang, STATUS_LABEL[b.status])
              : due > 0
                ? `${L('ค้าง ', 'Due ')}${money(due)}`
                : L('ครบแล้ว', 'Paid in full')}
        </small>
      </span>
      <span className="st">
        <StatusPill status={b.status} lang={lang} />
      </span>
      <span className="chev">
        <Icon name="chev" />
      </span>
    </>
  )
  if (onOpen)
    return (
      <button type="button" className="row" onClick={onOpen}>
        {inner}
      </button>
    )
  return (
    <Link className="row" href={`${BO}/bookings?open=${b.id}`}>
      {inner}
    </Link>
  )
}

function eventText(e: { event: string; note: string }, L: Tr, lang: Lang) {
  const st = (k: string) => pair(lang, STATUS_LABEL[k], k)
  let m = /^created \((\w+)\)$/.exec(e.event)
  let text = e.event
  if (m) text = `${L('สร้างการจอง', 'Booking created')} · ${st(m[1])}`
  else if ((m = /^status: (\w+) → (\w+)$/.exec(e.event)))
    text = `${L('สถานะ', 'Status')}: ${st(m[1])} → ${st(m[2])}`
  else
    text =
      {
        'slip approved': L('อนุมัติสลิป', 'Slip approved'),
        'slip rejected': L('ปฏิเสธสลิป', 'Slip rejected'),
        'payment recorded': L('บันทึกการรับเงิน', 'Payment recorded'),
        'payment received': L('รับชำระออนไลน์', 'Online payment received'),
        'payment failed': L('ชำระออนไลน์ไม่สำเร็จ', 'Online payment failed'),
        'payment mismatch': L(
          'ยอดหรือการจองไม่ตรงกับรายการชำระ ตรวจสอบด่วน',
          'Payment does not match the booking, check it',
        ),
        'paid after hold expired': L('ชำระหลังหมดเวลากันที่นั่ง', 'Paid after the hold expired'),
        'refund needed': L('ต้องคืนเงินลูกค้า', 'Refund needed'),
        'check duplicate payment': L('อาจชำระซ้ำ ตรวจสอบ', 'Possible duplicate payment, check'),
        'slip uploaded': L('ลูกค้าส่งสลิป', 'Customer sent a slip'),
        'website booking (hold)': L('จองผ่านเว็บไซต์', 'Website booking'),
        cancelled: L('ยกเลิกการจอง', 'Booking cancelled'),
      }[e.event] ?? e.event
  return e.note ? `${text} · ${e.note}` : text
}

function SlipBox({ p, L }: { p: PaymentVM; L: Tr }) {
  if (p.slip)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={p.slip.url} alt={p.slip.alt || L('สลิป', 'Slip')} />
  return (
    <span className="slipph">
      <Icon name="slip" />
      <b className="num">{money(p.amount)}</b>
      {L('ยังไม่มีไฟล์สลิป', 'No slip file')}
      {p.ref && <span className="num">{p.ref}</span>}
    </span>
  )
}

const payIcon = (p: PaymentVM) =>
  p.provider === 'cash'
    ? 'wallet'
    : p.provider === 'transfer'
      ? 'bank'
      : p.method === 'promptpay'
        ? 'qr'
        : p.method === 'card' || p.provider === 'omise'
          ? 'card'
          : 'slip'

// "Omise · PromptPay QR", "Transfer slip", with a DEMO badge for simulated payments
function PayVia({ p, lang }: { p: PaymentVM; lang: Lang }) {
  const method = p.method && p.provider !== 'slip' && p.provider !== 'cash' ? METHOD_LABEL[p.method] : null
  return (
    <>
      {p.provider === 'demo' && <span className="pill nodot demo">DEMO</span>}{' '}
      {pair(lang, PROVIDER_LABEL[p.provider], p.provider)}
      {method ? ` · ${pair(lang, method)}` : ''}
    </>
  )
}

type ModalKind = null | 'pay' | 'reject' | 'cancel' | 'slip' | 'new'

export type BookingsProps = {
  lang: Lang
  bookings: BookingVM[]
  departures: DepartureVM[]
  customers: CustomerOption[]
  holdMinutes: number
  depositPct: number
  balanceDays: number
  today: string
  initial: {
    open: number | null
    status: string
    newBooking: { dep?: number; cust?: number } | null
  }
}

export function BookingsClient(props: BookingsProps) {
  const { lang, bookings, today } = props
  const L = translator(lang)
  const toast = useToast()
  const [pending, start] = useTransition()
  const [q, setQ] = useState('')
  const [chip, setChip] = useState(props.initial.status)
  const [openId, setOpenId] = useState<number | null>(props.initial.open)
  const [menu, setMenu] = useState(false)
  const [modal, setModal] = useState<ModalKind>(props.initial.newBooking ? 'new' : null)
  const minute = useMinute()

  const open = bookings.find((b) => b.id === openId) ?? null

  const setUrl = (id: number | null) => {
    const url = new URL(window.location.href)
    url.searchParams.delete('new')
    url.searchParams.delete('dep')
    url.searchParams.delete('cust')
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

  const act = (fn: () => Promise<ActionResult>, after?: (r: ActionResult) => void) =>
    start(async () => {
      const r = await fn()
      toast(r.message, r.ok)
      if (r.ok) {
        setModal(null)
        setMenu(false)
        // The action revalidates /backoffice, so the new data arrives with its response
        after?.(r)
      }
    })

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: bookings.length }
    for (const [k] of CHIPS) c[k] = bookings.filter((b) => chipMatch(k, b.status)).length
    return c
  }, [bookings])

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return bookings
      .filter((b) => chipMatch(chip, b.status))
      .filter(
        (b) =>
          !s ||
          [b.code, b.customer?.name, b.departure?.name, ...b.participants.map((p) => p.name)]
            .join(' ')
            .toLowerCase()
            .includes(s),
      )
      .sort(
        (a, b) =>
          (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9) ||
          (a.departure?.start ?? '').localeCompare(b.departure?.start ?? ''),
      )
  }, [bookings, chip, q])

  return (
    <>
      <div className="ph">
        <div>
          <h1>{L('การจอง', 'Bookings')}</h1>
          <p className="lede">
            {L('ค้นหาด้วยชื่อ รหัสการจอง หรือชื่อทริป', 'Search by name, booking code or trip')}
          </p>
        </div>
        <div className="acts">
          <button className="btn y" type="button" onClick={() => setModal('new')}>
            <Icon name="plus" />
            {L('เพิ่มการจอง', 'Add booking')}
          </button>
        </div>
      </div>
      <SubTabs
        items={[
          { href: `${BO}/bookings`, label: L('การจอง', 'Bookings'), icon: 'ticket', on: true },
          {
            href: `${BO}/bookings/payments`,
            label: L('การชำระเงิน', 'Payments'),
            icon: 'wallet',
            on: false,
          },
        ]}
      />
      <div className="toolbar">
        <label className="search">
          <Icon name="search" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={L('ค้นหา เช่น DP-2611 หรือ Emma', 'Search e.g. DP-2611 or Emma')}
            aria-label={L('ค้นหา', 'Search')}
          />
        </label>
      </div>
      <div className="chips" role="group">
        <button type="button" aria-pressed={chip === 'all'} onClick={() => setChip('all')}>
          {L('ทั้งหมด', 'All')} <sup className="num">{counts.all}</sup>
        </button>
        {CHIPS.filter(([k]) => k !== 'expired' || counts.expired > 0).map(([k, st]) => (
          <button key={k} type="button" aria-pressed={chip === k} onClick={() => setChip(k)}>
            {pair(lang, STATUS_LABEL[st])} <sup className="num">{counts[k]}</sup>
          </button>
        ))}
      </div>
      <div className="card p0">
        <div className="rows">
          <div className="row head">
            <span>{L('ลูกค้า', 'Customer')}</span>
            <span>{L('ทริป / วันที่', 'Trip / date')}</span>
            <span className="pxc">{L('จำนวน', 'Pax')}</span>
            <span>{L('ยอดเงิน', 'Amount')}</span>
            <span>{L('สถานะ', 'Status')}</span>
            <span />
          </div>
          {list.length ? (
            list.map((b) => (
              <BookingRow key={b.id} b={b} lang={lang} onOpen={() => openDrawer(b.id)} />
            ))
          ) : (
            <div className="empty">
              {L('ไม่พบการจองที่ตรงกับคำค้นหา', 'No bookings match your search')}
            </div>
          )}
        </div>
      </div>

      <div className={`scrim${open ? ' on' : ''}`} onClick={closeDrawer} />
      <aside
        className={`drawer${open ? ' on' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={L('การจอง', 'Booking')}
        aria-hidden={!open}
      >
        {open && (
          <Drawer
            b={open}
            {...props}
            L={L}
            minute={minute}
            menu={menu}
            setMenu={setMenu}
            pending={pending}
            onClose={closeDrawer}
            onModal={setModal}
            onApprove={() => act(() => approveSlipAction(open.id))}
            onComplete={() => act(() => completeBookingAction(open.id))}
          />
        )}
      </aside>

      {modal === 'pay' && open && (
        <PayModal
          b={open}
          L={L}
          lang={lang}
          today={today}
          balanceDays={props.balanceDays}
          pending={pending}
          onClose={() => setModal(null)}
          onSave={(v) => act(() => recordPaymentAction({ bookingId: open.id, ...v }))}
        />
      )}
      {modal === 'reject' && open && (
        <RejectModal
          L={L}
          pending={pending}
          onClose={() => setModal(null)}
          onSave={(reason) => act(() => rejectSlipAction(open.id, reason))}
        />
      )}
      {modal === 'cancel' && open && (
        <CancelModal
          b={open}
          L={L}
          today={today}
          pending={pending}
          onClose={() => setModal(null)}
          onSave={(v) => act(() => cancelBookingAction({ bookingId: open.id, ...v }))}
        />
      )}
      {modal === 'slip' && open && <SlipLightbox b={open} L={L} onClose={() => setModal(null)} />}
      {modal === 'new' && (
        <NewBookingModal
          {...props}
          L={L}
          pending={pending}
          preset={props.initial.newBooking}
          onClose={() => {
            setModal(null)
            setUrl(openId)
          }}
          onSave={(v) =>
            act(
              () => createBookingAction(v),
              (r) => {
                setChip('all')
                setQ('')
                if (typeof r.id === 'number') openDrawer(r.id)
              },
            )
          }
        />
      )}
    </>
  )
}

function Drawer({
  b,
  lang,
  L,
  today,
  balanceDays,
  minute,
  menu,
  setMenu,
  pending,
  onClose,
  onModal,
  onApprove,
  onComplete,
}: BookingsProps & {
  b: BookingVM
  L: Tr
  minute: number | null
  menu: boolean
  setMenu: (v: boolean) => void
  pending: boolean
  onClose: () => void
  onModal: (m: ModalKind) => void
  onApprove: () => void
  onComplete: () => void
}) {
  const d = b.departure
  const paid = paidOf(b)
  const due = dueOf(b)
  const voided = ['cancelled', 'refunded', 'expired'].includes(b.status)
  const idx = STEPS.findIndex((s) => s[0] === b.status)
  // Only a transfer slip waits for staff; a pending card/QR attempt is listed with the payments
  const pendingPay = b.payments.find((p) => p.status === 'pending' && p.provider === 'slip') ?? null
  const shown = b.payments.filter((p) => p !== pendingPay)
  const balDue = d ? addDays(d.start, -balanceDays) : null
  const healthIn = b.participants.filter((p) => p.healthOk).length
  const pct = (p: PaymentVM) => (b.total ? Math.round((p.amount / b.total) * 100) : 0)
  const holdLeft =
    b.status === 'hold' && b.holdExpiresAt && minute !== null
      ? Math.floor(Date.parse(b.holdExpiresAt) / 60000) - minute
      : null

  const primary: { label: string; icon: string; onClick: () => void } | null =
    b.status === 'pending_review'
      ? { label: L('อนุมัติสลิป', 'Approve slip'), icon: 'check', onClick: onApprove }
      : b.status === 'hold' || b.status === 'expired'
        ? {
            label: L('บันทึกการรับมัดจำ', 'Record deposit'),
            icon: 'wallet',
            onClick: () => onModal('pay'),
          }
        : b.status === 'deposit_paid'
          ? {
              label: L('รับชำระส่วนที่เหลือ', 'Collect balance'),
              icon: 'wallet',
              onClick: () => onModal('pay'),
            }
          : b.status === 'paid'
            ? {
                label: L('ปิดงาน · เดินทางเสร็จแล้ว', 'Mark trip completed'),
                icon: 'check',
                onClick: onComplete,
              }
            : null

  return (
    <>
      <div className="dh">
        <span className="code num">{b.code}</span>
        <span className="tagc">{pair(lang, SOURCE_LABEL[b.source], b.source)}</span>
        <button className="ibtn" type="button" onClick={onClose} aria-label={L('ปิด', 'Close')}>
          <Icon name="x" />
        </button>
      </div>
      <div className="db">
        <div className="dtitle">
          <h2>{b.customer?.name ?? L('ลูกค้า', 'Customer')}</h2>
          <p>
            {d?.name} · {d ? frange(d.start, d.end, lang) : ''} · {b.participants.length}{' '}
            {L('คน', 'pax')}
          </p>
          <StatusPill status={b.status} lang={lang} />
          {holdLeft !== null && (
            <span className="small muted" style={{ marginLeft: 6 }}>
              <Icon name="clock" />{' '}
              {holdLeft > 0
                ? L(`ที่นั่งจะถูกปล่อยใน ${holdLeft} นาที`, `Seats release in ${holdLeft} min`)
                : L('หมดเวลากันที่นั่งแล้ว', 'The seat hold has run out')}
            </span>
          )}
        </div>
        {(b.status === 'cancelled' || b.status === 'refunded') && (
          <div className="banner red">
            <Icon name="alert" />
            <span>
              {b.status === 'refunded'
                ? L(
                    `การจองนี้ถูกยกเลิกแล้ว และคืนเงิน ${money(b.payments.filter((p) => p.kind === 'refund' && p.status === 'succeeded').reduce((s, p) => s + p.amount, 0))} แล้ว`,
                    `This booking was cancelled and ${money(b.payments.filter((p) => p.kind === 'refund' && p.status === 'succeeded').reduce((s, p) => s + p.amount, 0))} was refunded`,
                  )
                : L('การจองนี้ถูกยกเลิกแล้ว', 'This booking was cancelled')}
            </span>
          </div>
        )}
        {b.status === 'expired' && (
          <div className="banner amb">
            <Icon name="clock" />
            <span>
              {L(
                'หมดเวลากันที่นั่งแล้ว รับมัดจำเพื่อยืนยันอีกครั้งได้ถ้ายังมีที่ว่าง',
                'The hold ran out. Record a deposit to confirm again if seats are free.',
              )}
            </span>
          </div>
        )}
        <div className={`stepper${voided ? ' x' : ''}`}>
          {STEPS.map((s, i) => {
            const cls = voided
              ? ''
              : i < idx || b.status === 'completed'
                ? 'ok'
                : i === idx
                  ? 'cur'
                  : ''
            return (
              <div key={s[0]} className={`stp ${cls}`}>
                <i>{cls === 'ok' ? <Icon name="check" /> : i + 1}</i>
                <span>{L(s[1], s[2])}</span>
              </div>
            )
          })}
        </div>

        {pendingPay && (
          <div className="dsec">
            <h3>{L('สลิปที่ลูกค้าส่งมา', 'Slip from customer')}</h3>
            <div className="reviewbox">
              <button
                type="button"
                className="slipwrap"
                onClick={() => pendingPay.slip && onModal('slip')}
                aria-label={L('ดูสลิปขนาดใหญ่', 'View slip larger')}
                style={pendingPay.slip ? undefined : { cursor: 'default' }}
              >
                <SlipBox p={pendingPay} L={L} />
              </button>
              <div>
                <h4>
                  {pair(lang, KIND_LABEL[pendingPay.kind])} {money(pendingPay.amount)}
                </h4>
                <p className="small muted">
                  {L('ส่งเมื่อ ', 'Sent ')}
                  {fd(ymd(pendingPay.at), lang)} {shopTime(pendingPay.at)} ·{' '}
                  {pair(lang, PROVIDER_LABEL[pendingPay.provider], pendingPay.provider)}
                </p>
                <ul className="checks">
                  <li
                    className={
                      pendingPay.kind !== 'deposit' || pendingPay.amount === b.deposit ? '' : 'warn'
                    }
                  >
                    <Icon
                      name={
                        pendingPay.kind !== 'deposit' || pendingPay.amount === b.deposit
                          ? 'check'
                          : 'alert'
                      }
                    />
                    <span>
                      {pendingPay.kind !== 'deposit'
                        ? L(`ยอดคงเหลือที่ต้องชำระ ${money(due)}`, `Balance due ${money(due)}`)
                        : pendingPay.amount === b.deposit
                          ? L(
                              `ยอดตรงกับมัดจำ ${pct(pendingPay)}%`,
                              `Amount matches the ${pct(pendingPay)}% deposit`,
                            )
                          : L(
                              `ยอดไม่ตรงกับมัดจำ ${money(b.deposit)}`,
                              `Amount differs from the ${money(b.deposit)} deposit`,
                            )}
                    </span>
                  </li>
                  <li className={pendingPay.ref ? '' : 'warn'}>
                    <Icon name={pendingPay.ref ? 'check' : 'alert'} />
                    <span>
                      {pendingPay.ref
                        ? `${L('เลขที่รายการ', 'Reference')} ${pendingPay.ref}`
                        : L('ไม่มีเลขที่รายการ', 'No transfer reference')}
                    </span>
                  </li>
                  <li className={pendingPay.slip ? '' : 'warn'}>
                    <Icon name={pendingPay.slip ? 'check' : 'alert'} />
                    <span>
                      {pendingPay.slip
                        ? L('แนบไฟล์สลิปแล้ว', 'Slip file attached')
                        : L(
                            'ยังไม่มีไฟล์สลิป ตรวจยอดในบัญชีก่อนอนุมัติ',
                            'No slip file; check the bank account first',
                          )}
                    </span>
                  </li>
                </ul>
                {pendingPay.slip && (
                  <button
                    className="link"
                    type="button"
                    style={{ marginTop: 10 }}
                    onClick={() => onModal('slip')}
                  >
                    <Icon name="eye" />
                    {L('ดูสลิปเต็ม', 'Open full slip')}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="dsec">
          <h3>{L('การชำระเงิน', 'Payments')}</h3>
          <div className="money num">
            <div>
              <span>{L('ยอดรวม', 'Total')}</span>
              <b>{money(b.total)}</b>
            </div>
            <div>
              <span>{L('จ่ายแล้ว', 'Paid')}</span>
              <b>{money(paid)}</b>
            </div>
            <div>
              <span>{L('คงเหลือ', 'Due')}</span>
              <b className={due > 0 ? 'due' : ''}>{money(due)}</b>
            </div>
          </div>
          {due > 0 && b.status === 'deposit_paid' && balDue && (
            <p className="small muted" style={{ marginTop: 8 }}>
              {L('ครบกำหนดชำระ ', 'Balance due ')}
              {fdy(balDue, lang)}{' '}
              {balDue < today && (
                <b style={{ color: 'var(--red)' }}>· {L('เลยกำหนดแล้ว', 'overdue')}</b>
              )}
            </p>
          )}
          <div style={{ marginTop: 6 }}>
            {shown.length === 0 && (
              <p className="muted small" style={{ padding: '8px 0' }}>
                {L('ยังไม่มีการชำระเงิน', 'No payments yet')}
              </p>
            )}
            {shown.map((p) => (
              <div className="pay" key={p.id}>
                <span
                  className="slipth"
                  style={{ display: 'grid', placeItems: 'center', color: 'var(--mu)' }}
                >
                  {p.slip ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.slip.url} alt={p.slip.alt} />
                  ) : (
                    <Icon name={payIcon(p)} />
                  )}
                </span>
                <span className="tx">
                  <b>
                    {p.kind === 'deposit'
                      ? L(`มัดจำ ${pct(p)}%`, `${pct(p)}% deposit`)
                      : pair(lang, KIND_LABEL[p.kind], p.kind)}
                  </b>
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

        <div className="dsec">
          <h3>
            {L('ผู้เดินทาง', 'Participants')}{' '}
            <span className="small muted">
              {healthIn}/{b.participants.length} {L('ส่งแบบฟอร์มแล้ว', 'forms in')}
            </span>
          </h3>
          <ul className="pax">
            {b.participants.map((p, i) => (
              <li key={i}>
                <div className="pn">
                  <b>
                    {i + 1}. {p.name}
                  </b>
                  {p.healthOk ? (
                    <span className="flag ok">
                      <Icon name="heart" />
                      {L('แบบฟอร์มสุขภาพครบ', 'Health form done')}
                    </span>
                  ) : (
                    <span className="flag no">
                      <Icon name="alert" />
                      {L('ยังไม่ส่งแบบฟอร์มสุขภาพ', 'Health form missing')}
                    </span>
                  )}
                </div>
                <div className="meta">
                  <span className="tagc">
                    {L('ใบอนุญาต', 'Cert')}: {pair(lang, CERT_LABEL[p.certLevel], p.certLevel)}
                  </span>
                  {p.suitSize && (
                    <span className="tagc">
                      {L('ไซซ์ชุด', 'Suit')} {p.suitSize}
                    </span>
                  )}
                  {p.rentals.length ? (
                    p.rentals.map((r) => (
                      <span key={r} className="tagc">
                        {L('เช่า', 'Rent')} {r}
                      </span>
                    ))
                  ) : (
                    <span className="tagc">{L('ไม่เช่าอุปกรณ์', 'Own gear')}</span>
                  )}
                  {p.healthNotes && <span className="tagc">{p.healthNotes}</span>}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {b.customer && (
          <div className="dsec">
            <h3>
              {L('ลูกค้า', 'Customer')}{' '}
              <Link className="link" href={`${BO}/customers/${b.customer.id}`}>
                {L('ดูโปรไฟล์', 'Profile')}
                <Icon name="chev" />
              </Link>
            </h3>
            <dl className="kv">
              <dt>{L('โทร', 'Phone')}</dt>
              <dd className="num">{b.customer.phone || '—'}</dd>
              <dt>{L('อีเมล', 'Email')}</dt>
              <dd>{b.customer.email || '—'}</dd>
              <dt>LINE</dt>
              <dd>{b.customer.lineId || '—'}</dd>
              <dt>{L('สัญชาติ', 'Nationality')}</dt>
              <dd>{b.customer.nationality || '—'}</dd>
            </dl>
          </div>
        )}

        <div className="dsec">
          <h3>{L('ประวัติ', 'History')}</h3>
          <ul className="tl2">
            {[...b.timeline].reverse().map((t, i) => (
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
            {b.status === 'completed'
              ? L('การจองนี้เสร็จสิ้นแล้ว', 'This booking is complete')
              : L('การจองนี้ปิดแล้ว', 'This booking is closed')}
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
          <button type="button" disabled>
            <Icon name="chat" />
            {L('ส่งข้อความ LINE', 'Send LINE message')}
            <Soon L={L} />
          </button>
          <button type="button" disabled>
            <Icon name="mail" />
            {L('ส่งอีเมลยืนยัน', 'Email confirmation')}
            <Soon L={L} />
          </button>
          {b.status === 'hold' && (
            <button type="button" disabled>
              <Icon name="link" />
              {L('ส่งลิงก์ชำระมัดจำ', 'Send deposit link')}
              <Soon L={L} />
            </button>
          )}
          {b.status === 'pending_review' && (
            <button type="button" onClick={() => onModal('reject')}>
              <Icon name="x" />
              {L('ปฏิเสธสลิป', 'Reject slip')}
            </button>
          )}
          {!['cancelled', 'refunded', 'completed'].includes(b.status) && (
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

function PayModal({
  b,
  L,
  lang,
  today,
  balanceDays,
  pending,
  onClose,
  onSave,
}: {
  b: BookingVM
  L: Tr
  lang: Lang
  today: string
  balanceDays: number
  pending: boolean
  onClose: () => void
  onSave: (v: {
    kind: 'deposit' | 'balance'
    provider: string
    amount: number
    ref: string
  }) => void
}) {
  const isDeposit = b.status === 'hold' || b.status === 'expired'
  const due = isDeposit ? b.deposit : dueOf(b)
  const [provider, setProvider] = useState('cash')
  const [amount, setAmount] = useState(String(due))
  const [ref, setRef] = useState('')
  const dueDate = b.departure ? addDays(b.departure.start, -balanceDays) : today
  return (
    <Modal onClose={onClose} label={L('รับชำระเงิน', 'Record payment')}>
      <h3>
        {isDeposit
          ? L('บันทึกการรับมัดจำ', 'Record deposit')
          : L('รับชำระส่วนที่เหลือ', 'Collect balance')}
      </h3>
      <p className="s">
        {b.customer?.name} · {b.code}
      </p>
      <div className="money num" style={{ marginTop: 18, gridTemplateColumns: '1fr 1fr' }}>
        <div>
          <span>{isDeposit ? L('มัดจำ', 'Deposit') : L('คงเหลือ', 'Due')}</span>
          <b className="due">{money(due)}</b>
        </div>
        <div>
          <span>{isDeposit ? L('ยอดรวม', 'Total') : L('ครบกำหนด', 'Due date')}</span>
          <b>{isDeposit ? money(b.total) : fd(dueDate, lang)}</b>
        </div>
      </div>
      <label className="field">
        <span>{L('ช่องทาง', 'Method')}</span>
        <select className="inp" value={provider} onChange={(e) => setProvider(e.target.value)}>
          {['cash', 'transfer', 'slip'].map((k) => (
            <option key={k} value={k}>
              {pair(lang, PROVIDER_LABEL[k])}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>{L('จำนวนเงิน (บาท)', 'Amount (THB)')}</span>
        <input
          className="inp num"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
        />
      </label>
      <label className="field">
        <span>{L('เลขที่รายการ (ถ้ามี)', 'Reference (optional)')}</span>
        <input className="inp" value={ref} onChange={(e) => setRef(e.target.value)} />
      </label>
      <div className="acts">
        <button className="btn o" type="button" onClick={onClose}>
          {L('ยกเลิก', 'Cancel')}
        </button>
        <button
          className="btn y"
          type="button"
          disabled={pending || !Number(amount)}
          onClick={() =>
            onSave({
              kind: isDeposit ? 'deposit' : 'balance',
              provider,
              amount: Number(amount),
              ref,
            })
          }
        >
          {L('บันทึกการรับเงิน', 'Record payment')}
        </button>
      </div>
    </Modal>
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
          'การจองจะกลับไปเป็น "จองไว้ชั่วคราว" เพื่อรอสลิปใหม่',
          'The booking goes back on hold while waiting for a new slip',
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

function CancelModal({
  b,
  L,
  today,
  pending,
  onClose,
  onSave,
}: {
  b: BookingVM
  L: Tr
  today: string
  pending: boolean
  onClose: () => void
  onSave: (v: { refund: number; note: string }) => void
}) {
  const paid = paidOf(b)
  const [refund, setRefund] = useState(String(paid))
  const [note, setNote] = useState('')
  const days = b.departure ? diffDays(today, b.departure.start) : null
  return (
    <Modal onClose={onClose} label={L('ยกเลิกการจอง', 'Cancel booking')}>
      <h3>{L('ยกเลิกการจองนี้?', 'Cancel this booking?')}</h3>
      <p className="s">
        {b.code} · {b.customer?.name}
      </p>
      {days !== null && (
        <div className="banner amb" style={{ marginTop: 16 }}>
          <Icon name="alert" />
          <span>
            {days >= 0
              ? L(
                  `ยกเลิกก่อนเดินทาง ${days} วัน · ตรวจนโยบายการยกเลิกก่อนคืนเงิน`,
                  `Cancelling ${days} days before departure · check the cancellation policy before refunding`,
                )
              : L('รอบนี้ออกเดินทางไปแล้ว', 'This departure has already left')}
          </span>
        </div>
      )}
      <label className="field">
        <span>
          {L('ยอดคืนเงิน (บาท)', 'Refund (THB)')} · {L('รับมาแล้ว', 'paid')} {money(paid)}
        </span>
        <input
          className="inp num"
          inputMode="numeric"
          value={refund}
          onChange={(e) => setRefund(e.target.value.replace(/[^\d]/g, ''))}
        />
      </label>
      <label className="field">
        <span>{L('หมายเหตุ', 'Note')}</span>
        <textarea
          className="inp"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={L('เช่น ลูกค้าป่วย', 'e.g. customer is sick')}
        />
      </label>
      <div className="acts">
        <button className="btn o" type="button" onClick={onClose}>
          {L('ไม่ยกเลิก', 'Keep booking')}
        </button>
        <button
          className="btn k"
          type="button"
          disabled={pending}
          onClick={() => onSave({ refund: Number(refund) || 0, note })}
        >
          {L('ยืนยันยกเลิก', 'Confirm cancel')}
        </button>
      </div>
    </Modal>
  )
}

function SlipLightbox({ b, L, onClose }: { b: BookingVM; L: Tr; onClose: () => void }) {
  const p =
    b.payments.find((x) => x.status === 'pending' && x.provider === 'slip' && x.slip) ??
    b.payments.find((x) => x.slip)
  return (
    <div className="lbox" onClick={onClose}>
      <button className="ibtn" type="button" onClick={onClose} aria-label={L('ปิด', 'Close')}>
        <Icon name="x" />
      </button>
      {p?.slip && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.slip.url} alt={p.slip.alt || L('สลิป', 'Slip')} />
      )}
    </div>
  )
}

function NewBookingModal({
  L,
  lang,
  departures,
  customers,
  holdMinutes,
  pending,
  preset,
  onClose,
  onSave,
}: BookingsProps & {
  L: Tr
  pending: boolean
  preset: { dep?: number; cust?: number } | null
  onClose: () => void
  onSave: (v: {
    departureId: number
    customerId?: number
    newCustomer?: { name: string; phone?: string; email?: string }
    pax: number
    source: string
  }) => void
}) {
  const left = (d: DepartureVM) => Math.max(0, d.capacity - d.booked - d.held)
  const firstOpen = departures.find((d) => left(d) > 0)
  const [dep, setDep] = useState(
    String(
      preset?.dep && departures.some((d) => d.id === preset.dep)
        ? preset.dep
        : (firstOpen?.id ?? ''),
    ),
  )
  const [cust, setCust] = useState(String(preset?.cust ?? customers[0]?.id ?? 'new'))
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [pax, setPax] = useState('1')
  const [source, setSource] = useState('walk_in')
  const isNew = cust === 'new'
  const ok = dep && (isNew ? name.trim() : cust)
  return (
    <Modal onClose={onClose} label={L('เพิ่มการจอง', 'Add booking')}>
      <h3>{L('เพิ่มการจอง', 'Add booking')}</h3>
      <p className="s">
        {L(
          `ระบบจะจองที่นั่งไว้ให้ ${holdMinutes} นาทีระหว่างรอชำระมัดจำ`,
          `Seats are held for ${holdMinutes} min while waiting for the deposit`,
        )}
      </p>
      <label className="field">
        <span>{L('รอบออกเดินทาง', 'Departure')}</span>
        <select className="inp" value={dep} onChange={(e) => setDep(e.target.value)}>
          {departures.length === 0 && (
            <option value="">{L('ยังไม่มีรอบที่เปิดรับจอง', 'No open departures')}</option>
          )}
          {departures.map((d) => (
            <option key={d.id} value={d.id} disabled={left(d) <= 0}>
              {fd(d.start, lang)} · {d.name} ({L('เหลือ', 'left')} {left(d)})
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>{L('ลูกค้า', 'Customer')}</span>
        <select className="inp" value={cust} onChange={(e) => setCust(e.target.value)}>
          <option value="new">+ {L('ลูกค้าใหม่', 'New customer')}</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      {isNew && (
        <>
          <label className="field">
            <span>{L('ชื่อ-นามสกุล', 'Full name')}</span>
            <input className="inp" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <div className="f2">
            <label className="field">
              <span>{L('เบอร์โทร', 'Phone')}</span>
              <input
                className="inp"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
            <label className="field">
              <span>{L('อีเมล', 'Email')}</span>
              <input
                className="inp"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
          </div>
        </>
      )}
      <div className="f2">
        <label className="field">
          <span>{L('จำนวนผู้เดินทาง', 'Number of people')}</span>
          <select className="inp" value={pax} onChange={(e) => setPax(e.target.value)}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{L('ช่องทาง', 'Channel')}</span>
          <select className="inp" value={source} onChange={(e) => setSource(e.target.value)}>
            {['walk_in', 'phone', 'line', 'agent', 'website'].map((k) => (
              <option key={k} value={k}>
                {pair(lang, SOURCE_LABEL[k])}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="acts">
        <button className="btn o" type="button" onClick={onClose}>
          {L('ยกเลิก', 'Cancel')}
        </button>
        <button
          className="btn y"
          type="button"
          disabled={pending || !ok}
          onClick={() =>
            onSave({
              departureId: Number(dep),
              customerId: isNew ? undefined : Number(cust),
              newCustomer: isNew ? { name, phone, email } : undefined,
              pax: Number(pax),
              source,
            })
          }
        >
          {L('สร้างการจอง', 'Create booking')}
        </button>
      </div>
    </Modal>
  )
}
