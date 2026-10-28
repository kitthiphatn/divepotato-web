'use client'

import { Fragment, useRef, useState, type ReactNode } from 'react'

import { newBlock, parseInline, type Block, type BlockKind, type Inline } from '../blocks'
import type { MediaItem } from '../data'
import { translator, type Lang } from '../i18n'
import { Icon } from '../icons'
import { MediaPicker, type useLibrary } from './MediaPicker'

type Library = ReturnType<typeof useLibrary>

const KIND_LABEL: Record<BlockKind, [string, string]> = {
  p: ['ย่อหน้า', 'Paragraph'],
  h2: ['หัวข้อใหญ่ (H2)', 'Heading (H2)'],
  h3: ['หัวข้อย่อย (H3)', 'Subheading (H3)'],
  ul: ['รายการจุด', 'Bullet list'],
  ol: ['รายการตัวเลข', 'Numbered list'],
  quote: ['ข้อความเด่น', 'Quote'],
  img: ['รูปภาพ', 'Photo'],
}
const ADD: [BlockKind, string, string, string][] = [
  ['p', 'ย่อหน้า', 'Paragraph', 'plus'],
  ['h2', 'H2', 'H2', 'plus'],
  ['h3', 'H3', 'H3', 'plus'],
  ['ul', 'รายการ', 'List', 'list'],
  ['img', 'รูปภาพ', 'Photo', 'image'],
]
const ALL: BlockKind[] = ['p', 'h2', 'h3', 'ul', 'ol', 'quote', 'img']

const rowsFor = (b: Block) =>
  Math.max(b.kind === 'p' || b.kind === 'ul' || b.kind === 'ol' ? 3 : 1, b.text.split('\n').length)

// Textarea-based block editor: one card per block, a type menu, move/remove buttons and
// bold/italic/link buttons that add the **, * and [](...) marks around the selection.
export function BlockEditor({
  lang,
  blocks,
  onChange,
  media,
  kinds = ALL,
  label,
}: {
  lang: Lang
  blocks: Block[]
  onChange: (blocks: Block[]) => void
  media?: Library
  kinds?: BlockKind[]
  label: string
}) {
  const L = translator(lang)
  const refs = useRef(new Map<string, HTMLTextAreaElement>())
  const [focus, setFocus] = useState<string | null>(null)
  const [picking, setPicking] = useState<string | null>(null)
  const canImg = kinds.includes('img') && !!media

  const set = (key: string, p: Partial<Block>) =>
    onChange(blocks.map((b) => (b.key === key ? { ...b, ...p } : b)))
  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= blocks.length) return
    const next = [...blocks]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }
  const add = (kind: BlockKind) => {
    const b = newBlock(kind)
    const at = focus ? blocks.findIndex((x) => x.key === focus) : -1
    const next = [...blocks]
    next.splice(at < 0 ? blocks.length : at + 1, 0, b)
    onChange(next)
    // The next block added goes after this one
    setFocus(b.key)
    if (kind === 'img') setPicking(b.key)
    else requestAnimationFrame(() => refs.current.get(b.key)?.focus())
  }

  // Wraps the selection of the focused block in a mark
  const mark = (open: string, close = open) => {
    const el = focus ? refs.current.get(focus) : null
    const b = blocks.find((x) => x.key === focus)
    if (!el || !b) return
    const { selectionStart: a, selectionEnd: z } = el
    const sel = b.text.slice(a, z) || L('ข้อความ', 'text')
    const text = b.text.slice(0, a) + open + sel + close + b.text.slice(z)
    set(b.key, { text })
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(a + open.length, a + open.length + sel.length)
    })
  }

  return (
    <div className="blked">
      <div className="bltool" role="toolbar" aria-label={label}>
        <button
          type="button"
          className="tb"
          title={L('ตัวหนา', 'Bold')}
          aria-label={L('ตัวหนา', 'Bold')}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => mark('**')}
        >
          <b>B</b>
        </button>
        <button
          type="button"
          className="tb"
          title={L('ตัวเอียง', 'Italic')}
          aria-label={L('ตัวเอียง', 'Italic')}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => mark('*')}
        >
          <i>I</i>
        </button>
        <button
          type="button"
          className="tb"
          title={L('ลิงก์', 'Link')}
          aria-label={L('ลิงก์', 'Link')}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => mark('[', '](https://)')}
        >
          <Icon name="link" />
        </button>
        <span className="sep" />
        {ADD.filter(([k]) => kinds.includes(k) && (k !== 'img' || canImg)).map(
          ([k, th, en, ic]) => (
            <button key={k} type="button" className="btn g sm" onClick={() => add(k)}>
              <Icon name={ic} />
              {L(th, en)}
            </button>
          ),
        )}
      </div>

      <div className="blks">
        {blocks.length === 0 && (
          <p className="muted small blempty">
            {L(
              'ยังไม่มีเนื้อหา · เพิ่มย่อหน้าแรกจากปุ่มด้านบน',
              'Empty · add a first paragraph above',
            )}
          </p>
        )}
        {blocks.map((b, i) => {
          const img = b.kind === 'img' && b.media ? media?.byId.get(b.media) : undefined
          return (
            <div key={b.key} className={`blk k-${b.kind}${focus === b.key ? ' on' : ''}`}>
              <div className="blh">
                <select
                  className="inp"
                  value={b.kind}
                  aria-label={L(`ชนิดบล็อกที่ ${i + 1}`, `Block ${i + 1} type`)}
                  onChange={(e) => {
                    const kind = e.target.value as BlockKind
                    set(b.key, { kind, ...(kind === 'img' ? { media: b.media ?? null } : {}) })
                    if (kind === 'img' && !b.media) setPicking(b.key)
                  }}
                >
                  {kinds
                    .filter((k) => k !== 'img' || canImg || b.kind === 'img')
                    .map((k) => (
                      <option key={k} value={k}>
                        {L(...KIND_LABEL[k])}
                      </option>
                    ))}
                </select>
                <span className="blact">
                  <button
                    type="button"
                    className="ibtn"
                    disabled={i === 0}
                    aria-label={L('ย้ายขึ้น', 'Move up')}
                    onClick={() => move(i, -1)}
                  >
                    <Icon name="back" className="up" />
                  </button>
                  <button
                    type="button"
                    className="ibtn"
                    disabled={i === blocks.length - 1}
                    aria-label={L('ย้ายลง', 'Move down')}
                    onClick={() => move(i, 1)}
                  >
                    <Icon name="back" className="down" />
                  </button>
                  <button
                    type="button"
                    className="ibtn"
                    aria-label={L('ลบบล็อก', 'Remove block')}
                    onClick={() => onChange(blocks.filter((x) => x.key !== b.key))}
                  >
                    <Icon name="trash" />
                  </button>
                </span>
              </div>
              {b.kind === 'img' ? (
                <div className="blimg">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img.url} alt={img.alt} />
                  ) : (
                    <span className="noimg">
                      <Icon name="image" />
                    </span>
                  )}
                  <button className="btn o sm" type="button" onClick={() => setPicking(b.key)}>
                    <Icon name="image" />
                    {img ? L('เปลี่ยนรูป', 'Change photo') : L('เลือกรูป', 'Pick a photo')}
                  </button>
                  {b.media && !img && (
                    <small className="muted">
                      {L('รูปนี้ไม่อยู่ในรายการล่าสุด', 'Photo not in the recent list')} #{b.media}
                    </small>
                  )}
                </div>
              ) : (
                <textarea
                  ref={(el) => {
                    if (el) refs.current.set(b.key, el)
                    else refs.current.delete(b.key)
                  }}
                  className="inp"
                  rows={rowsFor(b)}
                  value={b.text}
                  aria-label={`${L(...KIND_LABEL[b.kind])} ${i + 1}`}
                  placeholder={
                    b.kind === 'ul' || b.kind === 'ol'
                      ? L('บรรทัดละหนึ่งข้อ', 'One item per line')
                      : b.kind === 'p'
                        ? L('พิมพ์ข้อความ… **ตัวหนา** *ตัวเอียง*', 'Type… **bold** *italic*')
                        : ''
                  }
                  onFocus={() => setFocus(b.key)}
                  onChange={(e) => set(b.key, { text: e.target.value })}
                />
              )}
            </div>
          )
        })}
      </div>
      <p className="hint" style={{ marginTop: 10 }}>
        {L(
          '**ตัวหนา** · *ตัวเอียง* · [ข้อความลิงก์](https://...) · รายการ: บรรทัดละหนึ่งข้อ',
          '**bold** · *italic* · [link text](https://...) · lists: one item per line',
        )}
      </p>

      {picking && media && (
        <MediaPicker
          lang={lang}
          library={media.lib}
          onUploaded={media.add}
          selected={(() => {
            const m = blocks.find((x) => x.key === picking)?.media
            return m ? [m] : []
          })()}
          onChange={(ids) => set(picking, { media: ids[0] ?? null })}
          onClose={() => setPicking(null)}
          title={L('รูปในบทความ', 'Photo in the article')}
        />
      )}
    </div>
  )
}

// ---------- preview rendering ----------

export function InlineText({ text }: { text: string }) {
  return <>{renderInline(parseInline(text))}</>
}

function renderInline(nodes: Inline[]): ReactNode[] {
  return nodes.map((n, i) => {
    if (n.t === 'link')
      return (
        <a key={i} href={n.url} onClick={(e) => e.preventDefault()}>
          {renderInline(n.children)}
        </a>
      )
    let el: ReactNode = n.text.includes('\n')
      ? n.text.split('\n').map((x, j) => (
          <Fragment key={j}>
            {j > 0 && <br />}
            {x}
          </Fragment>
        ))
      : n.text
    if (n.format & 2) el = <em>{el}</em>
    if (n.format & 1) el = <strong>{el}</strong>
    return <Fragment key={i}>{el}</Fragment>
  })
}

// The body as the public site would show it
export function BlocksPreview({ blocks, byId }: { blocks: Block[]; byId: Map<number, MediaItem> }) {
  return (
    <>
      {blocks.map((b) => {
        const items = () =>
          b.text
            .split('\n')
            .map((x) => x.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, ''))
            .filter((x) => x.trim())
            .map((x, i) => (
              <li key={i}>
                <InlineText text={x} />
              </li>
            ))
        switch (b.kind) {
          case 'h2':
            return b.text.trim() ? (
              <h2 key={b.key}>
                <InlineText text={b.text} />
              </h2>
            ) : null
          case 'h3':
            return b.text.trim() ? (
              <h3 key={b.key}>
                <InlineText text={b.text} />
              </h3>
            ) : null
          case 'ul':
            return <ul key={b.key}>{items()}</ul>
          case 'ol':
            return <ol key={b.key}>{items()}</ol>
          case 'quote':
            return b.text.trim() ? (
              <blockquote key={b.key}>
                <InlineText text={b.text} />
              </blockquote>
            ) : null
          case 'img': {
            const m = b.media ? byId.get(b.media) : undefined
            return m ? (
              <figure key={b.key}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.url} alt={m.alt} />
              </figure>
            ) : null
          }
          default:
            return b.text.trim() ? (
              <p key={b.key}>
                <InlineText text={b.text} />
              </p>
            ) : null
        }
      })}
    </>
  )
}
