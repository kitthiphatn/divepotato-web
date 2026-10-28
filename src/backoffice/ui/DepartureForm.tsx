'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { saveDepartureAction, type DepartureInput } from '../actions/departures'
import { DEP_STATUS_LABEL, pair, translator, type Lang } from '../i18n'
import { Icon } from '../icons'
import { BO } from '../nav'
import { useToast } from './Toast'

export type OfferingOption = { id: number; kind: 'trip' | 'course'; name: string; days: number }

export function DepartureForm({
  lang,
  offerings,
  value,
}: {
  lang: Lang
  offerings: OfferingOption[]
  value: DepartureInput
}) {
  const L = translator(lang)
  const toast = useToast()
  const router = useRouter()
  const [pending, start] = useTransition()
  const [v, setV] = useState(value)
  const set = <K extends keyof DepartureInput>(k: K, x: DepartureInput[K]) =>
    setV((o) => ({ ...o, [k]: x }))
  const options = offerings.filter((o) => o.kind === v.kind)

  const save = () =>
    start(async () => {
      const r = await saveDepartureAction(v)
      toast(r.message, r.ok)
      if (r.ok && r.redirect) router.push(r.redirect)
    })

  return (
    <div className="edit" style={{ gridTemplateColumns: 'minmax(0,760px)' }}>
      <div className="forms">
        <section className="card fsec">
          <h3>
            <span className="no">1</span>
            {L('ทริปหรือคอร์ส', 'Trip or course')}
          </h3>
          <div className="tabs" role="tablist">
            {(['trip', 'course'] as const).map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={v.kind === k}
                onClick={() => setV((o) => ({ ...o, kind: k, offeringId: 0 }))}
              >
                {k === 'trip' ? L('ทริป', 'Trip') : L('คอร์สเรียน', 'Course')}
              </button>
            ))}
          </div>
          <label className="field">
            <span>{v.kind === 'trip' ? L('ทริป', 'Trip') : L('คอร์สเรียน', 'Course')}</span>
            <select
              className="inp"
              value={v.offeringId || ''}
              onChange={(e) => {
                const id = Number(e.target.value)
                const o = offerings.find((x) => x.id === id && x.kind === v.kind)
                setV((x) => {
                  const next = { ...x, offeringId: id }
                  // Suggest the end date from the trip/course length
                  if (o && x.start && o.days > 0) {
                    const d = new Date(`${x.start}T12:00:00Z`)
                    d.setUTCDate(d.getUTCDate() + o.days - 1)
                    next.end = d.toISOString().slice(0, 10)
                  }
                  return next
                })
              }}
            >
              <option value="">{L('เลือก…', 'Choose…')}</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
        </section>
        <section className="card fsec">
          <h3>
            <span className="no">2</span>
            {L('วันและที่นั่ง', 'Dates & seats')}
          </h3>
          <div className="f2">
            <label className="field">
              <span>{L('วันเริ่ม', 'Start date')}</span>
              <input
                className="inp"
                type="date"
                value={v.start}
                onChange={(e) => set('start', e.target.value)}
              />
            </label>
            <label className="field">
              <span>{L('วันสิ้นสุด', 'End date')}</span>
              <input
                className="inp"
                type="date"
                value={v.end}
                min={v.start}
                onChange={(e) => set('end', e.target.value)}
              />
            </label>
          </div>
          <div className="f3">
            <label className="field">
              <span>{L('จำนวนที่นั่ง', 'Capacity')}</span>
              <div className="unit">
                <input
                  className="inp num"
                  type="number"
                  min={1}
                  value={v.capacity}
                  onChange={(e) => set('capacity', Number(e.target.value))}
                />
                <em>{L('ที่', 'seats')}</em>
              </div>
            </label>
            <label className="field">
              <span>{L('เรือ / สถานที่', 'Boat / venue')}</span>
              <input className="inp" value={v.boat} onChange={(e) => set('boat', e.target.value)} />
            </label>
            <label className="field">
              <span>{L('สถานะ', 'Status')}</span>
              <select
                className="inp"
                value={v.status}
                onChange={(e) => set('status', e.target.value as DepartureInput['status'])}
              >
                {(['open', 'full', 'closed'] as const).map((k) => (
                  <option key={k} value={k}>
                    {pair(lang, DEP_STATUS_LABEL[k])}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
            <span>{L('บันทึก', 'Notes')}</span>
            <textarea
              className="inp"
              value={v.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          </label>
        </section>
        <div className="savebar">
          <Link className="btn o lg" href={v.id ? `${BO}/departures/${v.id}` : `${BO}/departures`}>
            {L('ยกเลิก', 'Cancel')}
          </Link>
          <button className="btn y lg" type="button" disabled={pending} onClick={save}>
            <Icon name="check" />
            {v.id ? L('บันทึก', 'Save') : L('เพิ่มรอบ', 'Add departure')}
          </button>
        </div>
      </div>
    </div>
  )
}
