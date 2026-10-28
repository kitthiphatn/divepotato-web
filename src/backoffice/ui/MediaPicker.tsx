'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'

import { uploadMediaAction } from '../actions/media'
import type { MediaItem } from '../data'
import { translator, type Lang } from '../i18n'
import { Icon } from '../icons'
import { Modal } from './Modal'
import { useToast } from './Toast'

const MAX_MB = 10

// The editor's copy of the media library, so a photo uploaded in the picker shows up at once
export function useLibrary(initial: MediaItem[]) {
  const [lib, setLib] = useState(initial)
  const byId = useMemo(() => new Map(lib.map((m) => [m.id, m])), [lib])
  const add = (m: MediaItem) => setLib((xs) => [m, ...xs.filter((x) => x.id !== m.id)])
  return { lib, byId, add }
}

type Draft = { file: File; preview: string; altTh: string; altEn: string }

// Media picker used by the trip, product and article editors and the home slides: a searchable
// grid of photos in Media plus an upload form (alt text in Thai and English).
// `multiple`: tap to add or remove; otherwise a tap picks the photo and closes the picker.
export function MediaPicker({
  lang,
  library,
  onUploaded,
  selected,
  onChange,
  onClose,
  multiple = false,
  title,
  hint,
}: {
  lang: Lang
  library: MediaItem[]
  onUploaded: (m: MediaItem) => void
  selected: number[]
  onChange: (ids: number[]) => void
  onClose: () => void
  multiple?: boolean
  title?: string
  hint?: string
}) {
  const L = translator(lang)
  const [q, setQ] = useState('')
  const up = useUpload(lang)
  const { draft, choose } = up
  const fileRef = useRef<HTMLInputElement>(null)

  const needle = q.trim().toLowerCase()
  const shown = needle
    ? library.filter(
        (m) => m.alt.toLowerCase().includes(needle) || m.filename.toLowerCase().includes(needle),
      )
    : library

  const pick = (id: number) => {
    if (multiple) {
      onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])
    } else {
      onChange([id])
      onClose()
    }
  }

  const upload = () =>
    up.upload((item) => {
      onUploaded(item)
      setQ('')
      if (multiple) onChange([...selected, item.id])
      else {
        onChange([item.id])
        onClose()
      }
    })

  return (
    <Modal onClose={onClose} wide label={L('คลังรูป', 'Media')}>
      <h3>{title ?? L('เลือกรูปจากคลังรูป', 'Pick from media')}</h3>
      <p className="s">
        {hint ??
          (multiple
            ? L('แตะเพื่อเพิ่มหรือเอาออก', 'Tap to add or remove')
            : L('แตะรูปเพื่อเลือก', 'Tap a photo to use it'))}
      </p>

      {draft ? (
        <UploadBox lang={lang} up={up} onUpload={upload} />
      ) : (
        <>
          <div className="mtools">
            <label className="search">
              <Icon name="search" />
              <input
                type="search"
                value={q}
                placeholder={L('ค้นหารูป', 'Search photos')}
                aria-label={L('ค้นหารูป', 'Search photos')}
                onChange={(e) => setQ(e.target.value)}
              />
            </label>
            <button className="btn y" type="button" onClick={() => fileRef.current?.click()}>
              <Icon name="upload" />
              {L('อัปโหลดรูป', 'Upload photo')}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              hidden
              onChange={(e) => {
                choose(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </div>
          {shown.length === 0 && (
            <p className="muted" style={{ marginTop: 16 }}>
              {library.length === 0
                ? L(
                    'ยังไม่มีรูปในคลัง · อัปโหลดรูปแรกได้เลย',
                    'No photos yet · upload the first one',
                  )
                : L('ไม่พบรูปที่ค้นหา', 'No photos match')}
            </p>
          )}
          <div className="mgrid">
            {shown.map((m) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={selected.includes(m.id)}
                title={m.alt}
                onClick={() => pick(m.id)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.url} alt={m.alt} loading="lazy" />
              </button>
            ))}
          </div>
          <div className="acts">
            {multiple ? (
              <button className="btn y" type="button" onClick={onClose}>
                {L('เสร็จ', 'Done')} · {selected.length}
              </button>
            ) : (
              <button className="btn o" type="button" onClick={onClose}>
                {L('ปิด', 'Close')}
              </button>
            )}
          </div>
        </>
      )}
    </Modal>
  )
}

// Upload state shared by the picker and the media library page: the chosen file with its
// preview, the alt text in Thai and English, and the upload through the server action
export function useUpload(lang: Lang) {
  const L = translator(lang)
  const toast = useToast()
  const [pending, start] = useTransition()
  const [draft, setDraft] = useState<Draft | null>(null)
  const preview = draft?.preview
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview)
    },
    [preview],
  )
  const choose = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast(L('เลือกไฟล์รูปภาพ', 'Choose an image file'), false)
      return
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast(L(`ไฟล์ใหญ่เกิน ${MAX_MB} MB`, `The file is larger than ${MAX_MB} MB`), false)
      return
    }
    const base = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ')
    setDraft({ file, preview: URL.createObjectURL(file), altTh: '', altEn: base })
  }

  const upload = (onDone: (m: MediaItem) => void) => {
    if (!draft) return
    if (!draft.altTh.trim()) {
      toast(L('ใส่คำอธิบายรูปภาษาไทย', 'Enter the Thai alt text'), false)
      return
    }
    const form = new FormData()
    form.set('file', draft.file)
    form.set('altTh', draft.altTh)
    form.set('altEn', draft.altEn)
    start(async () => {
      const r = await uploadMediaAction(form)
      toast(r.message, r.ok)
      if (!r.ok || !r.item) return
      setDraft(null)
      onDone(r.item)
    })
  }

  return { draft, setDraft, choose, upload, pending }
}

export function UploadBox({
  lang,
  up,
  onUpload,
}: {
  lang: Lang
  up: ReturnType<typeof useUpload>
  onUpload: () => void
}) {
  const L = translator(lang)
  const { draft, setDraft, pending } = up
  if (!draft) return null
  const upload = onUpload
  return (
    <div className="upbox">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={draft.preview} alt="" />
      <div>
        <p className="small muted">
          {draft.file.name} ·{' '}
          {draft.file.size < 1024 * 1024
            ? `${Math.max(1, Math.round(draft.file.size / 1024))} KB`
            : `${(draft.file.size / 1024 / 1024).toFixed(1)} MB`}
        </p>
        <label className="field">
          <span>{L('คำอธิบายรูป (ไทย) *', 'Alt text (Thai) *')}</span>
          <input
            className="inp"
            value={draft.altTh}
            maxLength={200}
            autoFocus
            placeholder={L('เช่น นักดำน้ำกับฝูงปลา', 'e.g. a diver with a school of fish')}
            onChange={(e) => setDraft((d) => d && { ...d, altTh: e.target.value })}
          />
        </label>
        <label className="field">
          <span>{L('คำอธิบายรูป (อังกฤษ)', 'Alt text (English)')}</span>
          <input
            className="inp"
            value={draft.altEn}
            maxLength={200}
            onChange={(e) => setDraft((d) => d && { ...d, altEn: e.target.value })}
          />
        </label>
        <p className="hint">
          {L(
            'ช่วยให้ Google และผู้พิการทางสายตาเข้าใจรูป',
            'Helps Google and screen-reader users understand the photo',
          )}
        </p>
      </div>
      <div className="acts">
        <button className="btn o" type="button" disabled={pending} onClick={() => setDraft(null)}>
          {L('ยกเลิก', 'Cancel')}
        </button>
        <button className="btn y" type="button" disabled={pending} onClick={upload}>
          <Icon name="upload" />
          {pending ? L('กำลังอัปโหลด…', 'Uploading…') : L('อัปโหลด', 'Upload')}
        </button>
      </div>
    </div>
  )
}
