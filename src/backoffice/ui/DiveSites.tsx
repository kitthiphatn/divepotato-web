'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { deleteDiveSiteAction, saveDiveSiteAction, type DiveSiteInput } from '../actions/diveSites'
import type { MediaItem } from '../data'
import { translator, type Lang } from '../i18n'
import { Icon } from '../icons'
import { LocTabs, PhotoField, type Loc } from './fields'
import { useLibrary } from './MediaPicker'
import { Modal } from './Modal'
import { useToast } from './Toast'

export type DiveSiteRow = DiveSiteInput & { id: number; trips: string[] }

const blank = (): DiveSiteInput => ({
  id: null,
  name: { th: '', en: '' },
  region: { th: '', en: '' },
  description: { th: '', en: '' },
  image: null,
})

// Dive sites as photo cards; tap one to edit (TH/EN name, region and description, photo).
// Trips list their dive sites, so deleting warns which trips still use the site.
export function DiveSitesManager({
  lang,
  sites,
  library,
}: {
  lang: Lang
  sites: DiveSiteRow[]
  library: MediaItem[]
}) {
  const L = translator(lang)
  const toast = useToast()
  const router = useRouter()
  const [pending, start] = useTransition()
  const [q, setQ] = useState('')
  const [edit, setEdit] = useState<(DiveSiteInput & { trips?: string[] }) | null>(null)
  const [confirmDel, setConfirmDel] = useState(false)
  const [tl, setTl] = useState<Loc>(lang)
  const media = useLibrary(library)

  const pick = (p: { th: string; en: string }) => (lang === 'en' ? p.en || p.th : p.th || p.en)
  const needle = q.trim().toLowerCase()
  const shown = needle
    ? sites.filter((x) =>
        [x.name.th, x.name.en, x.region.th, x.region.en].some((t) =>
          t.toLowerCase().includes(needle),
        ),
      )
    : sites
  const open = (v: DiveSiteInput & { trips?: string[] }) => {
    setConfirmDel(false)
    setTl(lang)
    setEdit(v)
  }
  const setLoc = (k: 'name' | 'region' | 'description', x: string) =>
    setEdit((e) => e && { ...e, [k]: { ...e[k], [tl]: x } })

  const save = () =>
    edit &&
    start(async () => {
      const r = await saveDiveSiteAction(edit)
      toast(r.message, r.ok)
      if (!r.ok) return
      setEdit(null)
      router.refresh()
    })
  const remove = () =>
    edit?.id &&
    start(async () => {
      const r = await deleteDiveSiteAction(edit.id!)
      toast(r.message, r.ok)
      if (!r.ok) return
      setEdit(null)
      router.refresh()
    })

  return (
    <>
      <div className="toolbar">
        <label className="search">
          <Icon name="search" />
          <input
            type="search"
            value={q}
            placeholder={L('ค้นหาชื่อหรือภูมิภาค', 'Search name or region')}
            aria-label={L('ค้นหาจุดดำน้ำ', 'Search dive sites')}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <span className="tagc">
          {sites.length} {L('จุดดำน้ำ', 'dive sites')}
        </span>
      </div>
      <div className="tgrid">
        {shown.map((x) => {
          const m = x.image ? media.byId.get(x.image) : undefined
          return (
            <button key={x.id} type="button" className="tcard" onClick={() => open(x)}>
              <div className="im">
                {m ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt={m.alt} loading="lazy" />
                ) : (
                  <span className="noimg">
                    <Icon name="image" />
                  </span>
                )}
                {pick(x.region) && <span className="tagc">{pick(x.region)}</span>}
              </div>
              <div className="bd">
                <span className="pl">
                  {x.trips.length
                    ? L(`ใช้ใน ${x.trips.length} ทริป`, `In ${x.trips.length} trip(s)`)
                    : L('ยังไม่มีทริป', 'No trips yet')}
                </span>
                <h3>{pick(x.name)}</h3>
                {pick(x.description) && <p className="clamp2">{pick(x.description)}</p>}
              </div>
            </button>
          )
        })}
        <button type="button" className="tcard add" onClick={() => open(blank())}>
          <span className="ic">
            <Icon name="plus" />
          </span>
          {L('เพิ่มจุดดำน้ำ', 'Add a dive site')}
        </button>
      </div>

      {edit && (
        <Modal
          wide
          onClose={() => setEdit(null)}
          label={
            edit.id ? L('แก้ไขจุดดำน้ำ', 'Edit dive site') : L('เพิ่มจุดดำน้ำ', 'Add dive site')
          }
        >
          <h3>
            {edit.id ? L('แก้ไขจุดดำน้ำ', 'Edit dive site') : L('เพิ่มจุดดำน้ำ', 'Add dive site')}
          </h3>
          <p className="s">
            {L(
              'ชื่อและรายละเอียดแสดงในหน้าทริปที่ไปจุดนี้',
              'The name and description show on trips that visit this site',
            )}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              save()
            }}
          >
            <PhotoField
              lang={lang}
              label={L('รูป', 'Photo')}
              value={edit.image}
              media={media}
              onChange={(id) => setEdit((e) => e && { ...e, image: id })}
            />
            <LocTabs tl={tl} onChange={setTl} />
            <div className="f2">
              <label className="field">
                <span>
                  {L('ชื่อจุดดำน้ำ', 'Name')} ({tl.toUpperCase()})
                </span>
                <input
                  className="inp"
                  value={edit.name[tl]}
                  autoFocus
                  onChange={(e) => setLoc('name', e.target.value)}
                />
              </label>
              <label className="field">
                <span>
                  {L('ภูมิภาค/ทะเล', 'Region')} ({tl.toUpperCase()})
                </span>
                <input
                  className="inp"
                  value={edit.region[tl]}
                  placeholder="Similan / Andaman"
                  onChange={(e) => setLoc('region', e.target.value)}
                />
              </label>
            </div>
            <label className="field">
              <span>
                {L('รายละเอียด', 'Description')} ({tl.toUpperCase()})
              </span>
              <textarea
                className="inp"
                rows={4}
                value={edit.description[tl]}
                onChange={(e) => setLoc('description', e.target.value)}
              />
            </label>
            {confirmDel && (edit.trips?.length ?? 0) > 0 && (
              <p className="banner red small">
                <Icon name="alert" />
                {L('ทริปเหล่านี้จะไม่มีจุดดำน้ำนี้อีก', 'These trips will lose this site')}:{' '}
                {edit.trips!.join(', ')}
              </p>
            )}
            <div className="acts">
              {edit.id &&
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
