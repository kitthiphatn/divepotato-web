// Simple block editing of Lexical rich text, used by the backoffice article and trip editors.
// A body is a list of blocks (paragraph, H2, H3, bullet or numbered list, quote, photo). Text
// inside a block uses a small markdown-like syntax: **bold**, *italic* and [link](https://...).
// `lexicalToBlocks` and `blocksToLexical` convert both ways without any editor library; text is
// always kept, and nodes the simple editor can't show (tables, embeds...) are reported as `lossy`
// so the screen can warn before the body is rewritten.
export type BlockKind = 'p' | 'h2' | 'h3' | 'ul' | 'ol' | 'quote' | 'img'
export type Block = {
  key: string
  kind: BlockKind
  // Text with inline marks; for lists one item per line
  text: string
  // Photo blocks: the Media id (and the Lexical node id when it came from an existing body)
  media?: number | null
  uid?: string
}

type Node = {
  type?: string
  text?: string
  format?: number | string
  tag?: string
  listType?: string
  url?: string
  fields?: { url?: string; linkType?: string; newTab?: boolean } | null
  value?: unknown
  id?: string
  relationTo?: string
  children?: Node[]
}

const BOLD = 1
const ITALIC = 2
const KNOWN_FORMATS = BOLD | ITALIC

let seq = 0
export const blockKey = () => `b${Date.now().toString(36)}${(seq++).toString(36)}`

export const newBlock = (kind: BlockKind = 'p', text = ''): Block => ({
  key: blockKey(),
  kind,
  text,
  ...(kind === 'img' ? { media: null } : {}),
})

// ---------- inline: text nodes <-> marked-up text ----------

export type Inline =
  { t: 'text'; text: string; format: number } | { t: 'link'; url: string; children: Inline[] }

const escapeText = (s: string) => s.replace(/([\\*[\]])/g, '\\$1')

function wrap(s: string, format: number) {
  if (!s) return s
  // Keep surrounding spaces outside the markers so "**a **b" never happens
  const m = s.match(/^(\s*)([\s\S]*?)(\s*)$/)!
  if (!m[2]) return s
  const mark =
    format & BOLD && format & ITALIC ? '***' : format & BOLD ? '**' : format & ITALIC ? '*' : ''
  return `${m[1]}${mark}${m[2]}${mark}${m[3]}`
}

function inlineToText(nodes: Node[] | undefined, lossy: { v: boolean }): string {
  let out = ''
  for (const n of nodes ?? []) {
    if (n.type === 'text') {
      const f = typeof n.format === 'number' ? n.format : 0
      if (f & ~KNOWN_FORMATS) lossy.v = true
      out += wrap(escapeText(n.text ?? ''), f)
    } else if (n.type === 'linebreak') out += '\n'
    else if (n.type === 'tab') out += '\t'
    else if (n.type === 'link' || n.type === 'autolink') {
      const url = n.fields?.url ?? n.url ?? ''
      const inner = inlineToText(n.children, lossy)
      if (url && n.fields?.linkType !== 'internal') out += `[${inner}](${url})`
      else {
        lossy.v = true
        out += inner
      }
    } else {
      // Unknown inline node (mention, inline block...): keep its text
      lossy.v = true
      out += n.children ? inlineToText(n.children, lossy) : escapeText(n.text ?? '')
    }
  }
  return out
}

// Parses **bold**, *italic*, ***both***, [text](url) and backslash escapes
export function parseInline(src: string, format = 0): Inline[] {
  const out: Inline[] = []
  let buf = ''
  const flush = () => {
    if (buf) out.push({ t: 'text', text: buf, format })
    buf = ''
  }
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (c === '\\' && i + 1 < src.length && '\\*[]'.includes(src[i + 1])) {
      buf += src[i + 1]
      i += 2
      continue
    }
    if (c === '[') {
      const close = findUnescaped(src, ']', i + 1)
      if (close > i && src[close + 1] === '(') {
        const end = src.indexOf(')', close + 2)
        const url = end > 0 ? src.slice(close + 2, end).trim() : ''
        if (url && /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(url)) {
          flush()
          out.push({ t: 'link', url, children: parseInline(src.slice(i + 1, close), format) })
          i = end + 1
          continue
        }
      }
    }
    if (c === '*') {
      const run = src.slice(i).match(/^\*{1,3}/)![0]
      const close = findUnescaped(src, run, i + run.length)
      // A marker opens only before a non-space and closes after one
      if (close > i + run.length && !/\s/.test(src[i + run.length]) && !/\s/.test(src[close - 1])) {
        flush()
        const bit = run.length === 3 ? BOLD | ITALIC : run.length === 2 ? BOLD : ITALIC
        out.push(...parseInline(src.slice(i + run.length, close), format | bit))
        i = close + run.length
        continue
      }
      buf += run
      i += run.length
      continue
    }
    buf += c
    i++
  }
  flush()
  // Merge neighbouring text with the same format
  return out.reduce<Inline[]>((acc, n) => {
    const last = acc[acc.length - 1]
    if (n.t === 'text' && last?.t === 'text' && last.format === n.format) last.text += n.text
    else acc.push(n)
    return acc
  }, [])
}

function findUnescaped(s: string, token: string, from: number) {
  for (let i = from; i <= s.length - token.length; i++) {
    if (s[i] === '\\') {
      i++
      continue
    }
    if (s.startsWith(token, i)) {
      // For single "*" skip over "**" runs so *a **b** c* nests
      if (token === '*' && s[i + 1] === '*') {
        i++
        continue
      }
      return i
    }
  }
  return -1
}

// Strips the marks (for previews and summaries)
const flat = (nodes: Inline[]): string =>
  nodes.map((n) => (n.t === 'text' ? n.text : flat(n.children))).join('')
export const plainInline = (s: string): string => flat(parseInline(s))

// ---------- Lexical -> blocks ----------

const relId = (v: unknown) =>
  typeof v === 'number'
    ? v
    : v && typeof v === 'object' && typeof (v as { id?: unknown }).id === 'number'
      ? (v as { id: number }).id
      : null

function listItems(list: Node, lossy: { v: boolean }): string[] {
  const items: string[] = []
  for (const li of list.children ?? []) {
    const nested = (li.children ?? []).filter((c) => c.type === 'list')
    const inline = (li.children ?? []).filter((c) => c.type !== 'list')
    const text = inlineToText(inline, lossy).replace(/\n/g, ' ')
    if (text.trim()) items.push(text)
    // Nested lists are flattened into the same list
    for (const sub of nested) {
      lossy.v = true
      items.push(...listItems(sub, lossy))
    }
  }
  return items
}

export function lexicalToBlocks(value: unknown): { blocks: Block[]; lossy: boolean } {
  const root = (value as { root?: Node } | null | undefined)?.root
  const lossy = { v: false }
  const blocks: Block[] = []
  for (const n of root?.children ?? []) {
    const b = (kind: BlockKind, text: string, extra: Partial<Block> = {}) =>
      blocks.push({ key: blockKey(), kind, text, ...extra })
    switch (n.type) {
      case 'paragraph': {
        const text = inlineToText(n.children, lossy)
        // Empty paragraphs are only spacing
        if (text.trim()) b('p', text)
        break
      }
      case 'heading': {
        if (n.tag !== 'h2' && n.tag !== 'h3') lossy.v = true
        b(n.tag === 'h1' || n.tag === 'h2' ? 'h2' : 'h3', inlineToText(n.children, lossy))
        break
      }
      case 'quote':
        b('quote', inlineToText(n.children, lossy))
        break
      case 'list':
        if (n.listType === 'check') lossy.v = true
        b(n.listType === 'number' ? 'ol' : 'ul', listItems(n, lossy).join('\n'))
        break
      case 'upload':
        if (n.relationTo && n.relationTo !== 'media') {
          lossy.v = true
          break
        }
        b('img', '', { media: relId(n.value), uid: n.id })
        break
      default: {
        // Horizontal rule, block, table...: keep any text as a paragraph
        lossy.v = true
        const text = inlineToText(n.children, lossy)
        if (text.trim()) b('p', text)
      }
    }
  }
  return { blocks, lossy: lossy.v }
}

// ---------- blocks -> Lexical ----------

const base = { direction: 'ltr' as const, format: '' as const, indent: 0, version: 1 }

function inlineToNodes(src: string): Record<string, unknown>[] {
  const nodes: Record<string, unknown>[] = []
  const lines = src.split('\n')
  lines.forEach((line, i) => {
    if (i > 0) nodes.push({ type: 'linebreak', version: 1 })
    for (const n of parseInline(line)) nodes.push(inlineNode(n))
  })
  return nodes
}

function inlineNode(n: Inline): Record<string, unknown> {
  if (n.t === 'text')
    return {
      type: 'text',
      version: 1,
      text: n.text,
      detail: 0,
      format: n.format,
      mode: 'normal',
      style: '',
    }
  return {
    ...base,
    type: 'link',
    version: 3,
    fields: { linkType: 'custom', url: n.url, newTab: /^https?:\/\//i.test(n.url) },
    children: n.children.map(inlineNode),
  }
}

const uploadId = () =>
  Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join('')

export function blocksToLexical(blocks: Block[]) {
  const children: Record<string, unknown>[] = []
  for (const b of blocks) {
    const text = b.text.replace(/\r\n/g, '\n')
    switch (b.kind) {
      case 'img':
        if (b.media)
          children.push({
            type: 'upload',
            version: 3,
            format: '',
            id: b.uid || uploadId(),
            fields: {},
            relationTo: 'media',
            value: b.media,
          })
        break
      case 'ul':
      case 'ol': {
        const items = text.split('\n').map((x) => x.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, ''))
        const kept = items.filter((x) => x.trim())
        if (!kept.length) break
        children.push({
          ...base,
          type: 'list',
          listType: b.kind === 'ol' ? 'number' : 'bullet',
          start: 1,
          tag: b.kind,
          children: kept.map((x, i) => ({
            ...base,
            type: 'listitem',
            value: i + 1,
            children: inlineToNodes(x.trim()),
          })),
        })
        break
      }
      case 'h2':
      case 'h3':
        if (!text.trim()) break
        children.push({
          ...base,
          type: 'heading',
          tag: b.kind,
          children: inlineToNodes(text.trim()),
        })
        break
      case 'quote':
        if (!text.trim()) break
        children.push({ ...base, type: 'quote', children: inlineToNodes(text.trim()) })
        break
      default:
        if (!text.trim()) break
        children.push({ ...base, type: 'paragraph', textFormat: 0, children: inlineToNodes(text) })
    }
  }
  return { root: { ...base, type: 'root', children } }
}

// Plain text of a body, for checks and summaries
export const blocksText = (blocks: Block[]) =>
  blocks
    .filter((b) => b.kind !== 'img')
    .map((b) => plainInline(b.text))
    .join('\n')
