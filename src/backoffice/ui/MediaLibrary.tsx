'use client'

import Link from 'next/link'
import { useRef, useState, useTransition } from 'react'

import {
  deleteMediaAction,
  mediaUsageAction,
  updateMediaAltAction,
  type MediaUse,
} from '../actions/media'
import { fdy, ymd } from '../format'
import { translator, type Lang } from '../i18n'
import { Icon } from '../icons'
import { WebsiteHead } from './fields'
import { UploadBox, useUpload } from './MediaPicker'
import { Modal } from './Modal'
import { useToast } from './Toast'

export type LibraryItem = {
  id: number
  url: string
  filename: string
  altTh: string
  altEn: string
  mimeType: string
  filesize: number
  width: number | null
  height: number | null
  createdAt: string
}

const size = (b: number) =>
  b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`

// Media library: search, upload (same form and server action as the picker), alt text in
// Thai and English, and delete (admins only, with a warning when the photo is still in use)
export function MediaLibrary({
  lang,
  items: initial,
  canDelete,
}: {
  lang: Lang
  items: LibraryItem[]
  canDelete: boolean
}) {
  const L = translator(lang)
  const toast = useToast()
  const [pending, start] = useTransition()
  const [items, setItems] = useState(initial)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<LibraryItem | null>(null)
  const [alt, setAlt] = useState({ th: '', en: '' })
  const [del, setDel] = useState<{ checking: boolean; uses: MediaUse[] } | null>(null)
  const up = useUpload(lang)
  const fileRef = useRef<HTMLInputElement>(null)

  const needle = q.trim().toLowerCase()
  const shown = needle
    ? items.filter((m) =>
        [m.altTh, m.altEn, m.filename].some((x) => x.toLowerCase().includes(needle)),
      )
    : items

  const show = (m: LibraryItem) => {
    setOpen(m)
    setAlt({ th: m.altTh, en: m.altEn })
    setDel(null)
  }
  const saveAlt = () =>
    open &&
    start(async () => {
      const r = await updateMediaAltAction(open.id, alt.th, alt.en)
      toast(r.message, r.ok)
      if (!r.ok) return
      const th = alt.th.trim() || alt.en.trim()
      const en = alt.en.trim() || th
      setItems((xs) => xs.map((x) => (x.id === open.id ? { ...x, altTh: th, altEn: en } : x)))
      setOpen(null)
    })
  const askDelete = () =>
    open &&
    start(async () => {
      setDel({ checking: true, uses: [] })
      const r = await mediaUsageAction(open.id)
      if (!r.ok) {
        toast(r.message, false)
        setDel(null)
        return
      }
      setDel({ checking: false, uses: r.uses ?? [] })
    })
  const doDelete = () =>
    open &&
    start(async () => {
      const r = await deleteMediaAction(open.id)
      toast(r.message, r.ok)
      if (!r.ok) return
      setItems((xs) => xs.filter((x) => x.id !== open.id))
      setOpen(null)
    })
  const upload = () =>
    up.upload((m) => {
      const now = new Date().toISOString()
      setItems((xs) => [
        {
          id: m.id,
          url: m.url,
          filename: m.filename,
          altTh: up.draft?.altTh.trim() || m.alt,
          altEn: up.draft?.altEn.trim() || up.draft?.altTh.trim() || m.alt,
          mimeType: up.draft?.file.type ?? 'image/*',
          filesize: up.draft?.file.size ?? 0,
          width: null,
          height: null,
          createdAt: now,
        },
        ...xs,
      ])
    })
  const label = (m: LibraryItem) => (lang === 'en' ? m.altEn || m.altTh : m.altTh || m.altEn)

  return (
    <>
      <WebsiteHead
        lang={lang}
        tab="media"
        lede={L(
          'รูปทั้งหมดที่ใช้บนเว็บไซต์ · แตะรูปเพื่อแก้คำอธิบาย',
          'Every photo used on the website · tap one to edit its alt text',
        )}
        acts={
          <button className="btn y" type="button" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" />
            {L('อัปโหลดรูป', 'Upload photo')}
          </button>
        }
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        hidden
        onChange={(e) => {
          up.choose(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <div className="toolbar">
        <label className="search">
          <Icon name="search" />
          <input
            type="search"
            value={q}
            placeholder={L('ค้นหาจากคำอธิบายหรือชื่อไฟล์', 'Search alt text or file name')}
            aria-label={L('ค้นหารูป', 'Search photos')}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <span className="tagc">
          {shown.length} / {items.length} {L('ไฟล์', 'files')}
        </span>
      </div>
      {shown.length === 0 ? (
        <div className="card empty">
          {items.length === 0
            ? L('ยังไม่มีรูปในคลัง · อัปโหลดรูปแรกได้เลย', 'No photos yet · upload the first one')
            : L('ไม่พบรูปที่ค้นหา', 'No photos match')}
        </div>
      ) : (
        <div className="mlib">
          {shown.map((m) => (
            <button key={m.id} type="button" onClick={() => show(m)}>
              <span className="th">
                {m.mimeType.startsWith('image/') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt={label(m)} loading="lazy" />
                ) : (
                  <Icon name="slip" />
                )}
              </span>
              <b>{label(m) || m.filename}</b>
              <small>{m.filename}</small>
            </button>
          ))}
        </div>
      )}

      {up.draft && (
        <Modal wide onClose={() => up.setDraft(null)} label={L('อัปโหลดรูป', 'Upload photo')}>
          <h3>{L('อัปโหลดรูป', 'Upload photo')}</h3>
          <p className="s">
            {L(
              'JPG, PNG, WebP, GIF หรือ AVIF ไม่เกิน 10 MB',
              'JPG, PNG, WebP, GIF or AVIF, up to 10 MB',
            )}
          </p>
          <UploadBox lang={lang} up={up} onUpload={upload} />
        </Modal>
      )}

      {open && (
        <Modal wide onClose={() => setOpen(null)} label={open.filename}>
          <div className="mdet">
            <div className="big">
              {open.mimeType.startsWith('image/') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={open.url} alt={label(open)} />
              ) : (
                <Icon name="slip" />
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <h3 className="fname">{open.filename}</h3>
              <p className="s">
                {open.width && open.height ? `${open.width}×${open.height} · ` : ''}
                {size(open.filesize)} · {fdy(ymd(open.createdAt), lang)}
              </p>
              <label className="field">
                <span>{L('คำอธิบายรูป (ไทย)', 'Alt text (Thai)')}</span>
                <input
                  className="inp"
                  value={alt.th}
                  maxLength={200}
                  onChange={(e) => setAlt((a) => ({ ...a, th: e.target.value }))}
                />
              </label>
              <label className="field">
                <span>{L('คำอธิบายรูป (อังกฤษ)', 'Alt text (English)')}</span>
                <input
                  className="inp"
                  value={alt.en}
                  maxLength={200}
                  onChange={(e) => setAlt((a) => ({ ...a, en: e.target.value }))}
                />
              </label>
              <p className="small">
                <a className="link" href={open.url} target="_blank" rel="noreferrer">
                  <Icon name="link" />
                  {L('เปิดไฟล์เต็ม', 'Open full file')}
                </a>
              </p>
            </div>
          </div>
          {del && (
            <div className={`banner ${del.uses.length ? 'red' : 'amb'} small mdel`}>
              <Icon name="alert" />
              <div>
                {del.checking ? (
                  L('กำลังตรวจว่ารูปนี้ใช้อยู่ที่ไหน…', 'Checking where this photo is used…')
                ) : del.uses.length ? (
                  <>
                    <b>
                      {L(
                        `รูปนี้ยังใช้อยู่ ${del.uses.length} ที่ ถ้าลบ ที่เหล่านี้จะไม่มีรูป`,
                        `This photo is still used in ${del.uses.length} place(s); they will lose it`,
                      )}
                    </b>
                    <ul>
                      {del.uses.map((u) => (
                        <li key={u.where}>
                          {u.href ? <Link href={u.href}>{u.where}</Link> : u.where}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  L(
                    'ไม่พบการใช้งานรูปนี้ (ไม่ได้ตรวจรูปที่อยู่ในเนื้อหาบทความ) ลบแล้วกู้คืนไม่ได้',
                    'Not used anywhere we can check (photos inside article text are not checked). Deleting cannot be undone.',
                  )
                )}
              </div>
            </div>
          )}
          <div className="acts">
            {canDelete &&
              (del && !del.checking ? (
                <button
                  className="btn red"
                  type="button"
                  disabled={pending}
                  onClick={doDelete}
                  style={{ marginRight: 'auto' }}
                >
                  <Icon name="trash" />
                  {L('ยืนยันลบรูป', 'Confirm delete')}
                </button>
              ) : (
                <button
                  className="btn t"
                  type="button"
                  disabled={pending}
                  onClick={askDelete}
                  style={{ marginRight: 'auto' }}
                >
                  <Icon name="trash" />
                  {L('ลบรูป', 'Delete')}
                </button>
              ))}
            <button className="btn o" type="button" onClick={() => setOpen(null)}>
              {L('ปิด', 'Close')}
            </button>
            <button className="btn y" type="button" disabled={pending} onClick={saveAlt}>
              <Icon name="check" />
              {L('บันทึกคำอธิบาย', 'Save alt text')}
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
