'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

import { fd, money, shopTime, ymd } from '../format'
import {
  KIND_LABEL,
  METHOD_LABEL,
  pair,
  PAY_STATUS_CLASS,
  PAY_STATUS_LABEL,
  PROVIDER_LABEL,
  translator,
  type Lang,
} from '../i18n'
import { Icon } from '../icons'
import { BO } from '../nav'
import { Pager } from './Pager'

export type PaymentRow = {
  id: number
  bookingId: number | null
  code: string
  customer: string
  kind: string
  provider: string
  method: string
  amount: number
  status: string
  ref: string
  slip: { url: string; alt: string } | null
  at: string
  reviewedBy: string
  reviewedAt: string | null
}

// Payments list: status chips, provider filter, slip thumbnails (tap for the full slip) and a
// link to the booking. Filters and paging live in the URL so the list can be shared.
export function PaymentsList({
  lang,
  rows,
  status,
  provider,
  counts,
  page,
  pages,
  total,
}: {
  lang: Lang
  rows: PaymentRow[]
  status: string
  provider: string
  counts: Record<string, number>
  page: number
  pages: number
  total: number
}) {
  const L = translator(lang)
  const path = usePathname()
  const sp = useSearchParams()
  const router = useRouter()
  const [slip, setSlip] = useState<PaymentRow | null>(null)
  const href = (p: Record<string, string>) => {
    const u = new URLSearchParams(sp.toString())
    for (const [k, v] of Object.entries(p)) {
      if (v) u.set(k, v)
      else u.delete(k)
    }
    if (!('page' in p)) u.delete('page')
    const q = u.toString()
    return q ? `${path}?${q}` : path
  }
  const all = Object.values(counts).reduce((a, b) => a + b, 0)

  return (
    <>
      <div className="toolbar">
        <div
          className="chips"
          role="group"
          style={{ marginBottom: 0, flex: '1 1 auto', minWidth: 0 }}
        >
          <Link href={href({ status: '' })} aria-pressed={!status} role="button" scroll={false}>
            {L('ทั้งหมด', 'All')} <sup className="num">{all}</sup>
          </Link>
          {Object.keys(PAY_STATUS_LABEL).map((k) => (
            <Link
              key={k}
              href={href({ status: k })}
              aria-pressed={status === k}
              role="button"
              scroll={false}
            >
              {pair(lang, PAY_STATUS_LABEL[k])} <sup className="num">{counts[k] ?? 0}</sup>
            </Link>
          ))}
        </div>
        <label className="field pfilt">
          <span className="sr">{L('ช่องทาง', 'Provider')}</span>
          <select
            className="inp"
            value={provider}
            onChange={(e) => {
              router.push(href({ provider: e.target.value }), { scroll: false })
            }}
          >
            <option value="">{L('ทุกช่องทาง', 'All providers')}</option>
            {Object.keys(PROVIDER_LABEL).map((k) => (
              <option key={k} value={k}>
                {pair(lang, PROVIDER_LABEL[k])}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="card p0">
        <div className="rows">
          <div className="row payrow head">
            <span>{L('สลิป', 'Slip')}</span>
            <span>{L('การจอง', 'Booking')}</span>
            <span>{L('ประเภท / ช่องทาง', 'Kind / provider')}</span>
            <span>{L('จำนวนเงิน', 'Amount')}</span>
            <span>{L('สถานะ', 'Status')}</span>
            <span />
          </div>
          {rows.length === 0 && (
            <div className="empty">{L('ไม่มีรายการชำระเงิน', 'No payments match')}</div>
          )}
          {rows.map((p) => (
            <div key={p.id} className="row payrow">
              <span className="sl">
                {p.slip ? (
                  <button
                    type="button"
                    className="slipth"
                    onClick={() => setSlip(p)}
                    aria-label={L('ดูสลิป', 'View slip')}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.slip.url} alt={p.slip.alt || L('สลิป', 'Slip')} />
                  </button>
                ) : (
                  <span className="noimg sm" aria-hidden="true">
                    <Icon
                      name={
                        p.provider === 'cash'
                          ? 'wallet'
                          : p.method === 'promptpay'
                            ? 'qr'
                            : p.method === 'card'
                              ? 'card'
                              : 'slip'
                      }
                    />
                  </span>
                )}
              </span>
              <span className="who">
                <span style={{ minWidth: 0 }}>
                  <b>{p.customer || L('ไม่ทราบชื่อ', 'Unknown')}</b>
                  <small className="num">
                    {p.code || `#${p.bookingId ?? '-'}`} · {fd(ymd(p.at), lang)} {shopTime(p.at)}
                  </small>
                </span>
              </span>
              <span className="c2">
                <b>{pair(lang, KIND_LABEL[p.kind], p.kind)}</b>
                <small>
                  {p.provider === 'demo' && <span className="pill nodot demo">DEMO</span>}{' '}
                  {pair(lang, PROVIDER_LABEL[p.provider], p.provider)}
                  {p.method && METHOD_LABEL[p.method] && p.provider !== 'slip' && p.provider !== 'cash'
                    ? ` · ${pair(lang, METHOD_LABEL[p.method])}`
                    : ''}
                  {p.ref ? ` · ${p.ref}` : ''}
                  {p.reviewedBy ? ` · ${L('ตรวจโดย', 'by')} ${p.reviewedBy}` : ''}
                </small>
              </span>
              <span className="amt">
                <b className="num">
                  {p.kind === 'refund' ? '−' : ''}
                  {money(p.amount)}
                </b>
              </span>
              <span className="st">
                <span className={`pill ${PAY_STATUS_CLASS[p.status] ?? 'st-hold'}`}>
                  {pair(lang, PAY_STATUS_LABEL[p.status], p.status)}
                </span>
              </span>
              <span className="go">
                {p.bookingId && (
                  <Link
                    className="btn t sm"
                    href={`${BO}/bookings?open=${p.bookingId}`}
                    aria-label={L(`เปิดการจอง ${p.code}`, `Open booking ${p.code}`)}
                  >
                    {L('เปิดการจอง', 'Open')}
                    <Icon name="chev" />
                  </Link>
                )}
              </span>
            </div>
          ))}
        </div>
        <Pager
          lang={lang}
          page={page}
          pages={pages}
          total={total}
          href={(n) => href({ page: String(n) })}
        />
      </div>

      {slip?.slip && (
        <div className="lbox" onClick={() => setSlip(null)}>
          <button
            className="ibtn"
            type="button"
            onClick={() => setSlip(null)}
            aria-label={L('ปิด', 'Close')}
          >
            <Icon name="x" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={slip.slip.url} alt={slip.slip.alt || L('สลิป', 'Slip')} />
        </div>
      )}
    </>
  )
}
