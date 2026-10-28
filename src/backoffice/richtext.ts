// Plain-text editing of Lexical rich text: one paragraph per line. Used where the backoffice
// shows a plain textarea (cancellation policy). Articles and trip descriptions use the block
// editor in blocks.ts instead, which keeps headings, lists, bold, italic, links and photos.
type Node = { type?: string; text?: string; children?: Node[] }

export function lexicalToText(value: unknown): string {
  const root = (value as { root?: Node } | null | undefined)?.root
  if (!root?.children) return ''
  const textOf = (n: Node): string =>
    n.type === 'linebreak' ? '\n' : (n.text ?? '') + (n.children ?? []).map(textOf).join('')
  return root.children.map(textOf).join('\n')
}

export function textToLexical(text: string) {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  return {
    root: {
      type: 'root',
      version: 1,
      direction: 'ltr' as const,
      format: '' as const,
      indent: 0,
      children: lines.map((line) => ({
        type: 'paragraph',
        version: 1,
        direction: 'ltr' as const,
        format: '' as const,
        indent: 0,
        textFormat: 0,
        children: line
          ? [
              {
                type: 'text',
                version: 1,
                text: line,
                detail: 0,
                format: 0,
                mode: 'normal',
                style: '',
              },
            ]
          : [],
      })),
    },
  }
}
