'use client'

import { useState, useTransition } from 'react'

import {
  createStaffAction,
  saveSettingsAction,
  setPasswordAction,
  setRoleAction,
  setUsernameAction,
  type SettingsInput,
  type StaffInput,
} from '../actions/settings'
import { normalizeUsername, usernameFromEmail } from '@/lib/username'

import { initials, money } from '../format'
import { ROLE_LABEL, translator, type Lang } from '../i18n'
import { Icon } from '../icons'
import { Modal } from './Modal'
import { useToast } from './Toast'

// A readable temporary password, e.g. "reef-7342-manta"
const WORDS = ['reef', 'manta', 'turtle', 'coral', 'shark', 'wave', 'ocean', 'whale']
function tempPassword() {
  const w = () => WORDS[Math.floor(Math.random() * WORDS.length)]
  return `${w()}-${Math.floor(1000 + Math.random() * 9000)}-${w()}`
}
const blankStaff = (): StaffInput => ({
  name: '',
  email: '',
  username: '',
  role: 'staff',
  password: tempPassword(),
})

export type StaffRow = {
  id: number
  name: string
  email: string
  username: string
  role: string
  me: boolean
}

export function SettingsForm({
  lang,
  value,
  staff,
  balanceDays,
}: {
  lang: Lang
  value: SettingsInput
  staff: StaffRow[]
  balanceDays: number
}) {
  const L = translator(lang)
  const toast = useToast()
  const [pending, start] = useTransition()
  const [v, setV] = useState(value)
  const [roles, setRoles] = useState(() => Object.fromEntries(staff.map((u) => [u.id, u.role])))
  const [tl, setTl] = useState<'th' | 'en'>(lang)
  const set = <K extends keyof SettingsInput>(k: K, x: SettingsInput[K]) =>
    setV((o) => ({ ...o, [k]: x }))
  const text = (k: keyof SettingsInput) => ({
    value: v[k] as string,
    onChange: (e: { target: { value: string } }) => set(k, e.target.value as never),
  })
  const [invite, setInvite] = useState<StaffInput | null>(null)
  // The username follows the email's local part until the admin types their own
  const [usernameTyped, setUsernameTyped] = useState(false)
  const [reset, setReset] = useState<{ u: StaffRow; password: string } | null>(null)
  const [rename, setRename] = useState<{ u: StaffRow; username: string } | null>(null)
  const openInvite = () => {
    setUsernameTyped(false)
    setInvite(blankStaff())
  }
  const addStaff = () =>
    invite &&
    start(async () => {
      const r = await createStaffAction(invite)
      toast(r.message, r.ok)
      if (r.ok) setInvite(null)
    })
  const saveUsername = () =>
    rename &&
    start(async () => {
      const r = await setUsernameAction(rename.u.id, rename.username)
      toast(r.message, r.ok)
      if (r.ok) setRename(null)
    })
  const savePassword = () =>
    reset &&
    start(async () => {
      const r = await setPasswordAction(reset.u.id, reset.password)
      toast(r.message, r.ok)
      if (r.ok) setReset(null)
    })
  const soon = <span className="soon">{L('เร็วๆ นี้', 'Coming soon')}</span>

  const save = () =>
    start(async () => {
      const r = await saveSettingsAction(v)
      toast(r.message, r.ok)
      if (r.ok) setV((o) => ({ ...o, cancellationDirty: { th: false, en: false } }))
    })

  const changeRole = (u: StaffRow, role: string) => {
    const prev = roles[u.id]
    setRoles((r) => ({ ...r, [u.id]: role }))
    start(async () => {
      const r = await setRoleAction(u.id, role)
      toast(r.message, r.ok)
      if (!r.ok) setRoles((x) => ({ ...x, [u.id]: prev }))
    })
  }

  const toggles: [string, string, string, string][] = [
    ['มีการจองใหม่', 'New booking', 'แจ้งกลุ่มทีมงานทันที', 'Notify the staff group right away'],
    ['ลูกค้าส่งสลิป', 'Slip uploaded', 'แจ้งให้ตรวจสลิป', 'Ask staff to review'],
    [
      'เตือนยอดคงเหลือ',
      'Balance reminder',
      'ส่งถึงลูกค้า 3 วันก่อนครบกำหนด',
      'Sent to customer 3 days before due',
    ],
    [
      'สรุปประจำวัน 07:00',
      'Daily summary 07:00',
      'รอบที่ออกวันนี้และงานค้าง',
      "Today's departures and open tasks",
    ],
  ]

  return (
    <div className="set">
      <nav className="snav" aria-label={L('หมวดการตั้งค่า', 'Settings sections')}>
        <a href="#set-book">{L('การจองและมัดจำ', 'Booking & deposit')}</a>
        <a href="#set-cancel">{L('นโยบายการยกเลิก', 'Cancellation')}</a>
        <a href="#set-pay">{L('ช่องทางรับเงิน', 'Payment channels')}</a>
        <a href="#set-line">{L('การแจ้งเตือน LINE', 'LINE notifications')}</a>
        <a href="#set-staff">{L('ทีมงานและสิทธิ์', 'Staff & roles')}</a>
      </nav>
      <div className="sets">
        <section className="card fsec" id="set-book">
          <h3>{L('การจองและมัดจำ', 'Booking & deposit')}</h3>
          <p className="hint">
            {L(
              'ใช้กับทุกทริป เว้นแต่ตั้งค่าแยกในหน้าทริป',
              'Applies to all trips unless set on a trip',
            )}
          </p>
          <div className="f3">
            <label className="field">
              <span>{L('มัดจำ', 'Deposit')}</span>
              <div className="unit">
                <input
                  className="inp num"
                  type="number"
                  min={0}
                  max={100}
                  value={v.depositPct}
                  onChange={(e) => set('depositPct', Number(e.target.value))}
                />
                <em>%</em>
              </div>
            </label>
            <label className="field">
              <span>{L('จองที่นั่งไว้ระหว่างรอชำระ', 'Hold seats while paying')}</span>
              <div className="unit">
                <input
                  className="inp num"
                  type="number"
                  min={1}
                  value={v.holdMinutes}
                  onChange={(e) => set('holdMinutes', Number(e.target.value))}
                />
                <em>{L('นาที', 'min')}</em>
              </div>
            </label>
            <label className="field">
              <span>{L('ชำระคงเหลือก่อนเดินทาง', 'Balance due before trip')}</span>
              <div className="unit">
                <input className="inp num" type="number" value={balanceDays} disabled readOnly />
                <em>{L('วัน', 'days')}</em>
              </div>
            </label>
          </div>
          <div className="calc">
            <span>
              {L('ตัวอย่าง: Open Water ฿15,500 → มัดจำ', 'Example: Open Water ฿15,500 → deposit')}{' '}
              <b className="num">{money(Math.round((15500 * (v.depositPct || 0)) / 100))}</b>
            </span>
          </div>
        </section>

        <section className="card fsec" id="set-cancel">
          <h3>{L('นโยบายการยกเลิก', 'Cancellation policy')}</h3>
          <p className="hint">
            {L('แสดงให้ลูกค้าเห็นก่อนชำระเงิน', 'Shown to customers before they pay')}
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
            <span className="sr">{L('นโยบายการยกเลิก', 'Cancellation policy')}</span>
            <textarea
              className="inp"
              rows={5}
              value={v.cancellation[tl]}
              onChange={(e) =>
                setV((o) => ({
                  ...o,
                  cancellation: { ...o.cancellation, [tl]: e.target.value },
                  cancellationDirty: { ...o.cancellationDirty, [tl]: true },
                }))
              }
            />
          </label>
          <p className="hint">
            {L('ข้อความธรรมดา บรรทัดละย่อหน้า', 'Plain text, one paragraph per line')}
          </p>
        </section>

        <section className="card fsec" id="set-pay">
          <h3>{L('ช่องทางรับชำระเงิน', 'Payment channels')}</h3>
          <p className="hint">
            {L(
              'ระบบชำระเงินออนไลน์เปิดใช้ในเฟสถัดไป ตอนนี้บันทึกคีย์ไว้ก่อนได้',
              'Online payment goes live in the next phase; you can store the keys now',
            )}
          </p>
          <div className="conn">
            <div className="cc">
              <span className="ci">
                <Icon name="qr" />
              </span>
              <b>{L('Omise · พร้อมเพย์', 'Omise · PromptPay')}</b>
              <p>
                {L(
                  'สแกน QR ยืนยันอัตโนมัติ ไม่ต้องตรวจสลิป',
                  'QR payment, confirmed automatically',
                )}
              </p>
              {soon}
            </div>
            <div className="cc">
              <span className="ci">
                <Icon name="card" />
              </span>
              <b>{L('Omise · บัตรเครดิต', 'Omise · Card')}</b>
              <p>Visa, Mastercard, JCB</p>
              {soon}
            </div>
            <div className="cc on">
              <span className="ci">
                <Icon name="bank" />
              </span>
              <b>{L('โอนผ่านธนาคาร', 'Bank transfer')}</b>
              <p>{L('ลูกค้าแนบสลิป ทีมงานตรวจเอง', 'Customer uploads a slip; staff review it')}</p>
              <span className="pill st-paid">{L('ใช้งานอยู่', 'In use')}</span>
            </div>
          </div>
          <div className="f2" style={{ marginTop: 18 }}>
            <label className="field">
              <span>Omise public key</span>
              <input
                className="inp"
                autoComplete="off"
                spellCheck={false}
                {...text('omisePublicKey')}
              />
            </label>
            <label className="field">
              <span>Omise secret key</span>
              <input
                className="inp"
                type="password"
                autoComplete="new-password"
                spellCheck={false}
                {...text('omiseSecretKey')}
              />
            </label>
          </div>
          <label className="field">
            <span>PromptPay ID</span>
            <input className="inp num" {...text('promptPayId')} />
          </label>
        </section>

        <section className="card fsec" id="set-line">
          <h3>{L('การแจ้งเตือน LINE', 'LINE notifications')}</h3>
          <p className="hint">
            {L(
              'ส่งข้อความผ่าน LINE และอีเมลเปิดใช้ในเฟสถัดไป',
              'LINE and email messages go live in the next phase',
            )}
          </p>
          <label className="field">
            <span>LINE channel access token</span>
            <input
              className="inp"
              type="password"
              autoComplete="new-password"
              spellCheck={false}
              {...text('lineChannelToken')}
            />
          </label>
          <div className="f2">
            <label className="field">
              <span>
                {L('LINE ผู้รับแจ้งเตือน (user/group ID)', 'LINE target (user/group ID)')}
              </span>
              <input className="inp" spellCheck={false} {...text('lineTarget')} />
            </label>
            <label className="field">
              <span>{L('อีเมลรับแจ้งเตือน', 'Notification email')}</span>
              <input className="inp" type="email" {...text('notifyEmail')} />
            </label>
          </div>
          <div style={{ marginTop: 10 }}>
            {toggles.map(([th, en, dth, den]) => (
              <div key={en} className="tog">
                <span>
                  <b>
                    {L(th, en)} {soon}
                  </b>
                  <span>{L(dth, den)}</span>
                </span>
                <label className="switch">
                  <input type="checkbox" disabled />
                  <i />
                  <span className="sr">{L(th, en)}</span>
                </label>
              </div>
            ))}
          </div>
        </section>

        <section className="card fsec" id="set-staff">
          <div className="ch" style={{ marginBottom: 4 }}>
            <h3>{L('ทีมงานและสิทธิ์', 'Staff & roles')}</h3>
            <button className="btn g sm" type="button" onClick={openInvite}>
              <Icon name="plus" />
              {L('เพิ่มทีมงาน', 'Add staff')}
            </button>
          </div>
          <ul className="staff">
            {staff.map((u) => (
              <li key={u.id}>
                <span className="who">
                  <span className={`av${u.me ? ' y' : ''}`}>{initials(u.name || u.email)}</span>
                  <span>
                    <b>
                      {u.name || u.email}
                      {u.me ? ` (${L('คุณ', 'you')})` : ''}
                    </b>
                    <small>
                      {u.username ? (
                        <>
                          <span className="uname">@{u.username}</span> · {u.email}
                        </>
                      ) : (
                        u.email
                      )}
                    </small>
                  </span>
                </span>
                <span className="sact">
                  <button
                    className="ibtn"
                    type="button"
                    title={L('แก้ชื่อผู้ใช้', 'Edit username')}
                    aria-label={L(
                      `แก้ชื่อผู้ใช้ของ ${u.name || u.email}`,
                      `Edit the username for ${u.name || u.email}`,
                    )}
                    onClick={() =>
                      setRename({ u, username: u.username || usernameFromEmail(u.email) })
                    }
                  >
                    <Icon name="edit" />
                  </button>
                  {!u.me && (
                    <button
                      className="ibtn"
                      type="button"
                      title={L('ตั้งรหัสผ่านใหม่', 'Set a new password')}
                      aria-label={L(
                        `ตั้งรหัสผ่านใหม่ให้ ${u.name || u.email}`,
                        `Set a new password for ${u.name || u.email}`,
                      )}
                      onClick={() => setReset({ u, password: tempPassword() })}
                    >
                      <Icon name="refund" />
                    </button>
                  )}
                  <select
                    className="inp"
                    value={roles[u.id] ?? u.role}
                    disabled={u.me || pending}
                    aria-label={L(
                      `สิทธิ์ของ ${u.name || u.email}`,
                      `Role for ${u.name || u.email}`,
                    )}
                    onChange={(e) => changeRole(u, e.target.value)}
                  >
                    {Object.entries(ROLE_LABEL).map(([k, r]) => (
                      <option key={k} value={k}>
                        {L(r[0], r[1])}
                      </option>
                    ))}
                  </select>
                </span>
              </li>
            ))}
          </ul>
          <div className="roles">
            {Object.entries(ROLE_LABEL).map(([k, r]) => (
              <div key={k}>
                <b>{L(r[0], r[1])}</b>
                {L(r[2], r[3])}
              </div>
            ))}
          </div>
        </section>

        <div className="savebar">
          <button className="btn y lg" type="button" disabled={pending} onClick={save}>
            <Icon name="check" />
            {L('บันทึกการตั้งค่า', 'Save settings')}
          </button>
        </div>
      </div>

      {invite && (
        <Modal onClose={() => setInvite(null)} label={L('เพิ่มทีมงาน', 'Add staff')}>
          <h3>{L('เพิ่มทีมงาน', 'Add a team member')}</h3>
          <p className="s">
            {L(
              'สร้างบัญชีพร้อมรหัสผ่านชั่วคราว แล้วส่งให้ทีมงานเข้าสู่ระบบที่ /backoffice',
              'Creates an account with a temporary password; send it to them to sign in at /backoffice',
            )}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              addStaff()
            }}
          >
            <label className="field">
              <span>{L('ชื่อ', 'Name')}</span>
              <input
                className="inp"
                value={invite.name}
                autoFocus
                required
                onChange={(e) => setInvite((x) => x && { ...x, name: e.target.value })}
              />
            </label>
            <label className="field">
              <span>{L('อีเมล', 'Email')}</span>
              <input
                className="inp"
                type="email"
                value={invite.email}
                required
                autoComplete="off"
                onChange={(e) => {
                  const email = e.target.value
                  setInvite(
                    (x) =>
                      x && {
                        ...x,
                        email,
                        username: usernameTyped ? x.username : usernameFromEmail(email),
                      },
                  )
                }}
              />
            </label>
            <label className="field">
              <span>{L('ชื่อผู้ใช้', 'Username')}</span>
              <input
                className="inp"
                value={invite.username}
                required
                maxLength={32}
                pattern="[a-z0-9._\-]+"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                onChange={(e) => {
                  setUsernameTyped(true)
                  setInvite((x) => x && { ...x, username: normalizeUsername(e.target.value) })
                }}
              />
              <small className="hint">
                {L(
                  'ใช้เข้าสู่ระบบแทนอีเมลได้ · a-z พิมพ์เล็ก ตัวเลข และ . _ -',
                  'Signs in instead of the email · lowercase a-z, 0-9 and . _ -',
                )}
              </small>
            </label>
            <label className="field">
              <span>{L('สิทธิ์', 'Role')}</span>
              <select
                className="inp"
                value={invite.role}
                onChange={(e) => setInvite((x) => x && { ...x, role: e.target.value })}
              >
                {Object.entries(ROLE_LABEL).map(([k, r]) => (
                  <option key={k} value={k}>
                    {L(r[0], r[1])} · {L(r[2], r[3])}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{L('รหัสผ่านชั่วคราว', 'Temporary password')}</span>
              <span className="unit pw">
                <input
                  className="inp"
                  value={invite.password}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  spellCheck={false}
                  onChange={(e) => setInvite((x) => x && { ...x, password: e.target.value })}
                />
                <button
                  className="btn t sm"
                  type="button"
                  onClick={() => setInvite((x) => x && { ...x, password: tempPassword() })}
                >
                  {L('สุ่มใหม่', 'New')}
                </button>
              </span>
            </label>
            <div className="acts">
              <button className="btn o" type="button" onClick={() => setInvite(null)}>
                {L('ยกเลิก', 'Cancel')}
              </button>
              <button className="btn y" type="submit" disabled={pending}>
                <Icon name="plus" />
                {L('เพิ่มทีมงาน', 'Add staff')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {rename && (
        <Modal onClose={() => setRename(null)} label={L('แก้ชื่อผู้ใช้', 'Edit username')}>
          <h3>{L('แก้ชื่อผู้ใช้', 'Edit username')}</h3>
          <p className="s">
            {rename.u.name || rename.u.email} ·{' '}
            {L(
              'ใช้ชื่อผู้ใช้ใหม่หรืออีเมลเดิมเข้าสู่ระบบได้',
              'They can sign in with the new username or their email',
            )}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              saveUsername()
            }}
          >
            <label className="field">
              <span>{L('ชื่อผู้ใช้', 'Username')}</span>
              <input
                className="inp"
                value={rename.username}
                autoFocus
                required
                maxLength={32}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                onChange={(e) =>
                  setRename((x) => x && { ...x, username: normalizeUsername(e.target.value) })
                }
              />
              <small className="hint">
                {L('a-z พิมพ์เล็ก ตัวเลข และ . _ -', 'Lowercase a-z, 0-9 and . _ -')}
              </small>
            </label>
            <div className="acts">
              <button className="btn o" type="button" onClick={() => setRename(null)}>
                {L('ยกเลิก', 'Cancel')}
              </button>
              <button className="btn y" type="submit" disabled={pending}>
                <Icon name="check" />
                {L('บันทึกชื่อผู้ใช้', 'Save username')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {reset && (
        <Modal onClose={() => setReset(null)} label={L('ตั้งรหัสผ่านใหม่', 'New password')}>
          <h3>{L('ตั้งรหัสผ่านใหม่', 'Set a new password')}</h3>
          <p className="s">
            {reset.u.name || reset.u.email} ·{' '}
            {L(
              'ส่งรหัสนี้ให้ทีมงาน แล้วให้เข้าสู่ระบบด้วยรหัสใหม่',
              'Send this to them; they sign in with it',
            )}
          </p>
          <label className="field">
            <span>{L('รหัสผ่านชั่วคราว', 'Temporary password')}</span>
            <input
              className="inp"
              value={reset.password}
              minLength={8}
              autoComplete="new-password"
              spellCheck={false}
              onChange={(e) => setReset((x) => x && { ...x, password: e.target.value })}
            />
          </label>
          <div className="acts">
            <button className="btn o" type="button" onClick={() => setReset(null)}>
              {L('ยกเลิก', 'Cancel')}
            </button>
            <button className="btn y" type="button" disabled={pending} onClick={savePassword}>
              <Icon name="check" />
              {L('บันทึกรหัสผ่าน', 'Save password')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
