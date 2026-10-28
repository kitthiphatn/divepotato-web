// Small presentational pieces shared by server and client components (no hooks)
import { STATUS_CLASS, STATUS_LABEL, translator, type Lang } from '../i18n'
import { Icon } from '../icons'

export function fillClass(booked: number, capacity: number, status?: string) {
  const r = capacity ? booked / capacity : 0
  return r >= 1 || status === 'full' ? 'full' : r >= 0.7 ? 'mid' : ''
}

export function SeatsBar({
  booked,
  capacity,
  status,
  wide,
  lang,
}: {
  booked: number
  capacity: number
  status?: string
  wide?: boolean
  lang: Lang
}) {
  const L = translator(lang)
  const pct = capacity ? Math.min(100, Math.round((booked / capacity) * 100)) : 0
  const left = capacity - booked
  return (
    <div className="seats">
      <div className={`bar ${fillClass(booked, capacity, status)}`}>
        <i style={{ width: `${pct}%` }} />
      </div>
      <span className="sn num">
        <b>{booked}</b>/{capacity}
        {wide
          ? ` · ${left <= 0 ? L('เต็มแล้ว', 'Full') : L(`เหลือ ${left} ที่`, `Left ${left}`)}`
          : ''}
      </span>
    </div>
  )
}

export function StatusPill({ status, lang }: { status: string; lang: Lang }) {
  const p = STATUS_LABEL[status]
  return (
    <span className={`pill ${STATUS_CLASS[status] ?? 'st-hold'}`}>
      {p ? (lang === 'en' ? p[1] : p[0]) : status}
    </span>
  )
}

export function Img({ src, alt = '' }: { src: string | null | undefined; alt?: string }) {
  if (!src)
    return (
      <span className="noimg" aria-hidden="true">
        <Icon name="image" />
      </span>
    )
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" />
}
