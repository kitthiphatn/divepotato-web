import {
  type JSXConvertersFunction,
  RichText as LexicalRichText,
} from '@payloadcms/richtext-lexical/react'
import Image from 'next/image'

import type { Media } from '@/payload-types'

type Node = {
  type?: string
  tag?: string
  text?: string
  children?: Node[]
  fields?: { url?: string; newTab?: boolean; linkType?: string } | null
  url?: string
  value?: unknown
}
type Data = { root?: Node } | null | undefined

const textOf = (n: Node): string => (n.text ?? '') + (n.children ?? []).map(textOf).join('')

// Heading anchors: readable for Latin text, numbered for Thai so the ids stay ASCII
export function headingId(text: string, index: number) {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return slug.length >= 3 ? `${slug}-${index + 1}` : `s${index + 1}`
}

// H2/H3 headings of a body, for the table of contents (same ids as the rendered headings)
export function headingsOf(data: unknown) {
  const out: { id: string; text: string; level: 2 | 3 }[] = []
  for (const n of (data as Data)?.root?.children ?? []) {
    if (n.type !== 'heading' || (n.tag !== 'h2' && n.tag !== 'h3')) continue
    const text = textOf(n).trim()
    if (!text) continue
    out.push({ id: headingId(text, out.length), text, level: n.tag === 'h2' ? 2 : 3 })
  }
  return out
}

export const plainText = (data: unknown) =>
  ((data as Data)?.root?.children ?? []).map(textOf).join('\n')

// Only web, mail and phone links (and site paths) are kept; anything else becomes plain text
const safeHref = (url: string | undefined) => {
  const v = (url ?? '').trim()
  return /^(https?:|mailto:|tel:|\/|#)/i.test(v) ? v : null
}

const converters: JSXConvertersFunction = ({ defaultConverters }) => {
  let h = 0
  return {
    ...defaultConverters,
    heading: ({ node, nodesToJSX }) => {
      const children = nodesToJSX({ nodes: node.children })
      const tag = ['h2', 'h3', 'h4'].includes(node.tag) ? node.tag : 'h2'
      if (tag === 'h4') return <h4>{children}</h4>
      const text = textOf(node as Node).trim()
      const id = text ? headingId(text, h++) : undefined
      return tag === 'h2' ? <h2 id={id}>{children}</h2> : <h3 id={id}>{children}</h3>
    },
    link: ({ node, nodesToJSX }) => {
      const children = nodesToJSX({ nodes: node.children })
      const href = node.fields?.linkType === 'internal' ? null : safeHref(node.fields?.url)
      if (!href) return <>{children}</>
      const ext = /^https?:/i.test(href)
      return (
        <a
          href={href}
          target={node.fields?.newTab ? '_blank' : undefined}
          rel={ext ? 'noopener noreferrer' : undefined}
        >
          {children}
        </a>
      )
    },
    autolink: ({ node, nodesToJSX }) => {
      const children = nodesToJSX({ nodes: node.children })
      const href = safeHref(node.fields?.url)
      return href ? (
        <a href={href} rel="noopener noreferrer">
          {children}
        </a>
      ) : (
        <>{children}</>
      )
    },
    upload: ({ node }) => {
      const m = (node as { value?: unknown }).value as Media | undefined
      if (!m || typeof m !== 'object' || !m.url || !m.mimeType?.startsWith('image')) return null
      return (
        <figure className="rt-fig">
          <Image
            src={m.url}
            alt={m.alt ?? ''}
            width={m.width ?? 1600}
            height={m.height ?? 900}
            sizes="(max-width: 800px) 100vw, 760px"
          />
        </figure>
      )
    },
  }
}

// Lexical JSON → React elements. No HTML strings are injected, so stored text can't add markup.
export function RichText({ data, className = 'prose' }: { data: unknown; className?: string }) {
  if (!(data as Data)?.root?.children?.length) return null
  return (
    <LexicalRichText
      data={data as never}
      className={className}
      converters={converters}
      disableIndent
      disableTextAlign
    />
  )
}
