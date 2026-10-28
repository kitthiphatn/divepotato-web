'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import {
  saveCustomerAction,
  saveCustomerNoteAction,
  type CustomerInput,
} from '../actions/customers'
import { fd, initials, money } from '../format'
import { CERT_LABEL, pair, translator, type Lang } from '../i18n'
import { Icon } from '../icons'
import { BO } from '../nav'
import { useToast } from './Toast'

export type CustomerRowVM = {
  id: number
  name: string
  email: string
  phone: string
  nationality: string
  cert: string
  bookings: number
  spent: number
  last: string | null
}

// The searchable list; filtering happens in the browser like the prototype
export function CustomerList({ lang, rows }: { lang: Lang; rows: CustomerRowVM[] }) {
  const L = translator(lang)
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase()
  const list = rows.filter(
    (c) => !needle || [c.name, c.email, c.phone].join(' ').toLowerCase().includes(needle),
  )
  return (
    <>
      <div className="toolbar">
        <label className="search">
          <Icon name="search" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={L('ค้นหาลูกค้า', 'Search customers')}
            aria-label={L('ค้นหาลูกค้า', 'Search customers')}
          />
        </label>
      </div>
      <div className="card p0">
        <div className="rows">
          <div className="row crow head">
            <span>{L('ชื่อ', 'Name')}</span>
            <span>{L('สัญชาติ', 'Nationality')}</span>
            <span>{L('ใบอนุญาต', 'Cert')}</span>
            <span>{L('การจอง', 'Bookings')}</span>
            <span>{L('ยอดใช้จ่าย', 'Spent')}</span>
            <span />
          </div>
          {list.length === 0 && (
            <div className="empty">{L('ไม่พบลูกค้า', 'No customers found')}</div>
          )}
          {list.map((c) => (
            <Link key={c.id} className="row crow" href={`${BO}/customers/${c.id}`}>
              <span className="who">
                <span className="av">{initials(c.name)}</span>
                <span style={{ minWidth: 0 }}>
                  <b>{c.name}</b>
                  <small>{c.email || c.phone || '—'}</small>
                </span>
              </span>
              <span className="c2 hide-m">{c.nationality || '—'}</span>
              <span className="st">
                {c.cert ? (
                  <span className="tagc">{pair(lang, CERT_LABEL[c.cert], c.cert)}</span>
                ) : (
                  <span className="muted">—</span>
                )}
              </span>
              <span className="hide-m num">{c.bookings}</span>
              <span className="amt num">
                <b>{money(c.spent)}</b>
                <small>{c.last ? `${L('ล่าสุด ', 'Last ')}${fd(c.last, lang)}` : ''}</small>
              </span>
              <span className="chev">
                <Icon name="chev" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}

export function CustomerNote({ lang, id, value }: { lang: Lang; id: number; value: string }) {
  const L = translator(lang)
  const toast = useToast()
  const [note, setNote] = useState(value)
  const [pending, start] = useTransition()
  return (
    <section className="card">
      <h3 style={{ marginBottom: 10 }}>{L('บันทึกของทีมงาน', 'Staff notes')}</h3>
      <textarea
        className="inp"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={L(
          'เช่น แพ้อาหารทะเล ชอบดำกับครูบอส',
          'e.g. allergic to shellfish, likes diving with Boss',
        )}
        aria-label={L('บันทึกของทีมงาน', 'Staff notes')}
      />
      <div style={{ marginTop: 12, textAlign: 'right' }}>
        <button
          className="btn k sm"
          type="button"
          disabled={pending || note === value}
          onClick={() =>
            start(async () => {
              const r = await saveCustomerNoteAction(id, note)
              toast(r.message, r.ok)
            })
          }
        >
          {L('บันทึกโน้ต', 'Save note')}
        </button>
      </div>
    </section>
  )
}

export function CustomerForm({ lang, value }: { lang: Lang; value: CustomerInput }) {
  const L = translator(lang)
  const toast = useToast()
  const router = useRouter()
  const [pending, start] = useTransition()
  const [v, setV] = useState(value)
  const set = (k: keyof Omit<CustomerInput, 'id'>) => (e: { target: { value: string } }) =>
    setV((o) => ({ ...o, [k]: e.target.value }))

  return (
    <form
      className="edit"
      style={{ gridTemplateColumns: 'minmax(0,760px)' }}
      onSubmit={(e) => {
        e.preventDefault()
        start(async () => {
          const r = await saveCustomerAction(v)
          toast(r.message, r.ok)
          if (r.ok && r.redirect) router.push(r.redirect)
        })
      }}
    >
      <div className="forms">
        <section className="card fsec">
          <h3>
            <span className="no">1</span>
            {L('ข้อมูลลูกค้า', 'Customer details')}
          </h3>
          <label className="field">
            <span>{L('ชื่อ-นามสกุล', 'Name')}</span>
            <input className="inp" required value={v.name} onChange={set('name')} />
          </label>
          <div className="f2">
            <label className="field">
              <span>{L('เบอร์โทร', 'Phone')}</span>
              <input className="inp num" type="tel" value={v.phone} onChange={set('phone')} />
            </label>
            <label className="field">
              <span>{L('อีเมล', 'Email')}</span>
              <input className="inp" type="email" value={v.email} onChange={set('email')} />
            </label>
          </div>
          <div className="f2">
            <label className="field">
              <span>LINE ID</span>
              <input className="inp" value={v.lineId} onChange={set('lineId')} />
            </label>
            <label className="field">
              <span>{L('สัญชาติ', 'Nationality')}</span>
              <input className="inp" value={v.nationality} onChange={set('nationality')} />
            </label>
          </div>
          <label className="field">
            <span>{L('บันทึกของทีมงาน', 'Staff notes')}</span>
            <textarea className="inp" value={v.notes} onChange={set('notes')} />
          </label>
        </section>
        <div className="savebar">
          <Link className="btn o lg" href={v.id ? `${BO}/customers/${v.id}` : `${BO}/customers`}>
            {L('ยกเลิก', 'Cancel')}
          </Link>
          <button className="btn y lg" type="submit" disabled={pending}>
            <Icon name="check" />
            {v.id ? L('บันทึก', 'Save') : L('เพิ่มลูกค้า', 'Add customer')}
          </button>
        </div>
      </div>
    </form>
  )
}
