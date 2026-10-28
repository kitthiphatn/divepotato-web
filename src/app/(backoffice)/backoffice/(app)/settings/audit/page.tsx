import type { Metadata } from 'next'
import Link from 'next/link'
import type { Where } from 'payload'

import { fd, shopTime, ymd } from '@/backoffice/format'
import { Icon } from '@/backoffice/icons'
import { BO } from '@/backoffice/nav'
import { requireUser } from '@/backoffice/server'
import { Pager } from '@/backoffice/ui/Pager'
import type { User } from '@/payload-types'

export const metadata: Metadata = { title: 'บันทึกการแก้ไข · Audit log' }

const PER_PAGE = 30
// Collections the shared audit hook writes for (src/hooks/audit.ts)
const COLLECTIONS: Record<string, readonly [string, string]> = {
  bookings: ['การจอง', 'Bookings'],
  payments: ['การชำระเงิน', 'Payments'],
  departures: ['รอบออกเดินทาง', 'Departures'],
  trips: ['ทริป', 'Trips'],
}
const ACTIONS: Record<string, readonly [string, string, string]> = {
  create: ['สร้าง', 'Created', 'st-paid'],
  update: ['แก้ไข', 'Updated', 'st-deposit'],
  delete: ['ลบ', 'Deleted', 'st-cancelled'],
}

const docHref = (slug: string, id: string) => {
  if (!/^\d+$/.test(id)) return null
  if (slug === 'bookings') return `${BO}/bookings?open=${id}`
  if (slug === 'departures') return `${BO}/departures/${id}`
  if (slug === 'trips') return `${BO}/trips/trip/${id}`
  if (slug === 'payments') return `${BO}/bookings/payments`
  return null
}

const short = (v: unknown) => {
  if (v === null || v === undefined || v === '') return '–'
  // A related record saved with the change: show its id and name instead of the whole record
  if (typeof v === 'object' && !Array.isArray(v) && 'id' in v) {
    const o = v as Record<string, unknown>
    const label = [o.code, o.title, o.name, o.email].find((x) => typeof x === 'string')
    return `#${String(o.id)}${label ? ` ${String(label)}` : ''}`
  }
  const s = typeof v === 'string' ? v : JSON.stringify(v)
  return s.length > 140 ? `${s.slice(0, 140)}…` : s
}

// /backoffice/settings/audit: read-only list of the audit log (admins only, as the collection
// allows), filtered by collection, user and action, newest first
export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const s = await requireUser(['admin'])
  const { L, lang } = s
  const sp = await searchParams
  const coll = sp.collection && /^[a-z-]{1,40}$/.test(sp.collection) ? sp.collection : ''
  const user = sp.user && /^\d+$/.test(sp.user) ? sp.user : ''
  const action = sp.action && sp.action in ACTIONS ? sp.action : ''
  const page = Math.max(1, Number(sp.page) || 1)
  const and: Where[] = []
  if (coll) and.push({ collectionSlug: { equals: coll } })
  if (user) and.push({ user: { equals: Number(user) } })
  if (action) and.push({ action: { equals: action } })

  const [logs, users] = await Promise.all([
    s.payload.find({
      collection: 'audit-logs',
      where: and.length ? { and } : undefined,
      sort: '-createdAt',
      limit: PER_PAGE,
      page,
      depth: 1,
      ...s.as,
    }),
    s.payload.find({
      collection: 'users',
      pagination: false,
      depth: 0,
      sort: 'name',
      select: { name: true, email: true },
      ...s.as,
    }),
  ])
  const qs = (p: Record<string, string>) => {
    const u = new URLSearchParams()
    const all = { collection: coll, user, action, ...p }
    for (const [k, v] of Object.entries(all)) if (v) u.set(k, v)
    const q = u.toString()
    return `${BO}/settings/audit${q ? `?${q}` : ''}`
  }

  return (
    <>
      <Link className="back" href={`${BO}/settings`}>
        <Icon name="back" />
        {L('ตั้งค่า', 'Settings')}
      </Link>
      <div className="ph" style={{ marginTop: 4 }}>
        <div>
          <h1>{L('บันทึกการแก้ไข', 'Audit log')}</h1>
          <p className="lede">
            {L(
              'ใครเปลี่ยนอะไรเมื่อไร ในการจอง การชำระเงิน รอบออกเดินทาง และทริป (ดูอย่างเดียว)',
              'Who changed what and when in bookings, payments, departures and trips (read-only)',
            )}
          </p>
        </div>
      </div>
      <form className="toolbar afilt" method="get" action={`${BO}/settings/audit`}>
        <label className="field">
          <span>{L('ประเภทข้อมูล', 'Collection')}</span>
          <select className="inp" name="collection" defaultValue={coll}>
            <option value="">{L('ทั้งหมด', 'All')}</option>
            {Object.entries(COLLECTIONS).map(([k, v]) => (
              <option key={k} value={k}>
                {L(v[0], v[1])}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{L('ผู้ใช้', 'User')}</span>
          <select className="inp" name="user" defaultValue={user}>
            <option value="">{L('ทุกคน', 'Everyone')}</option>
            {users.docs.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name || u.email}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{L('การกระทำ', 'Action')}</span>
          <select className="inp" name="action" defaultValue={action}>
            <option value="">{L('ทั้งหมด', 'All')}</option>
            {Object.entries(ACTIONS).map(([k, v]) => (
              <option key={k} value={k}>
                {L(v[0], v[1])}
              </option>
            ))}
          </select>
        </label>
        <button className="btn k" type="submit">
          <Icon name="search" />
          {L('กรอง', 'Filter')}
        </button>
        {(coll || user || action) && (
          <Link className="btn t" href={`${BO}/settings/audit`}>
            <Icon name="x" />
            {L('ล้าง', 'Clear')}
          </Link>
        )}
      </form>
      <div className="card p0">
        <div className="rows">
          <div className="row alog head">
            <span>{L('เวลา', 'Time')}</span>
            <span>{L('การกระทำ', 'Action')}</span>
            <span>{L('ข้อมูล', 'Record')}</span>
            <span>{L('ผู้ใช้', 'User')}</span>
            <span>{L('สิ่งที่เปลี่ยน', 'Changes')}</span>
          </div>
          {logs.docs.length === 0 && <div className="empty">{L('ไม่มีบันทึก', 'No entries')}</div>}
          {logs.docs.map((g) => {
            const a = ACTIONS[g.action]
            const c = COLLECTIONS[g.collectionSlug]
            const u = typeof g.user === 'object' ? (g.user as User | null) : null
            const href = docHref(g.collectionSlug, g.docId)
            const diff =
              g.diff && typeof g.diff === 'object' && !Array.isArray(g.diff)
                ? (g.diff as Record<string, { from?: unknown; to?: unknown }>)
                : {}
            const keys = Object.keys(diff)
            return (
              <div key={g.id} className="row alog">
                <span className="amt">
                  <small className="num">
                    {fd(ymd(g.createdAt), lang)} {shopTime(g.createdAt)}
                  </small>
                </span>
                <span className="st">
                  <span className={`pill ${a?.[2] ?? 'st-hold'}`}>
                    {a ? L(a[0], a[1]) : g.action}
                  </span>
                </span>
                <span className="c2">
                  <b>
                    {c ? L(c[0], c[1]) : g.collectionSlug}{' '}
                    {href ? <Link href={href}>#{g.docId}</Link> : `#${g.docId}`}
                  </b>
                </span>
                <span className="c2 hide-m">
                  <small>{u ? u.name || u.email : L('ระบบ', 'System')}</small>
                </span>
                <span className="chg">
                  {keys.length === 0 ? (
                    <small className="muted">–</small>
                  ) : (
                    <details>
                      <summary>
                        {keys.slice(0, 4).join(', ')}
                        {keys.length > 4 ? ` +${keys.length - 4}` : ''}
                      </summary>
                      <dl>
                        {keys.map((k) => (
                          <div key={k}>
                            <dt>{k}</dt>
                            <dd>
                              <s>{short(diff[k]?.from)}</s> → {short(diff[k]?.to)}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </details>
                  )}
                </span>
              </div>
            )
          })}
        </div>
        <Pager
          lang={lang}
          page={logs.page ?? 1}
          pages={logs.totalPages}
          total={logs.totalDocs}
          href={(n) => qs({ page: String(n) })}
        />
      </div>
    </>
  )
}
