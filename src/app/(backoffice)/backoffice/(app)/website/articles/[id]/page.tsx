import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import type { PostInput } from '@/backoffice/actions/posts'
import { lexicalToBlocks, newBlock } from '@/backoffice/blocks'
import { mediaLibrary, relId } from '@/backoffice/data'
import { todayYmd, ymd } from '@/backoffice/format'
import { POST_CATEGORIES } from '@/backoffice/i18n'
import { requireUser } from '@/backoffice/server'
import { ArticleEditor } from '@/backoffice/ui/ArticleEditor'

export const metadata: Metadata = { title: 'แก้ไขบทความ · Edit article' }

// /backoffice/website/articles/new and /backoffice/website/articles/[id]
export default async function ArticleEditPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireUser(['admin', 'editor'])
  const { id } = await params
  if (id !== 'new' && !/^\d+$/.test(id)) notFound()
  const library = await mediaLibrary(s)

  let value: PostInput = {
    id: null,
    published: false,
    slug: '',
    category: 'news',
    date: todayYmd(),
    publishedAt: null,
    cover: null,
    title: { th: '', en: '' },
    excerpt: { th: '', en: '' },
    body: { th: [newBlock('p')], en: [newBlock('p')] },
    bodyDirty: { th: true, en: true },
    seoTitle: { th: '', en: '' },
    seoDescription: { th: '', en: '' },
  }
  let lossy = { th: false, en: false }

  if (id !== 'new') {
    const read = (locale: 'th' | 'en') =>
      s.payload
        .findByID({
          collection: 'posts',
          id: Number(id),
          draft: true,
          depth: 0,
          locale,
          fallbackLocale: false,
          ...s.as,
        })
        .catch(() => null)
    const [th, en] = await Promise.all([read('th'), read('en')])
    if (!th || !en) notFound()
    const bth = lexicalToBlocks(th.content)
    const ben = lexicalToBlocks(en.content)
    lossy = { th: bth.lossy, en: ben.lossy }
    value = {
      id: th.id,
      published: th._status === 'published',
      slug: th.slug ?? '',
      category: POST_CATEGORIES.find((c) => c === th.category) ?? 'news',
      date: th.publishedAt ? ymd(th.publishedAt) : todayYmd(),
      publishedAt: th.publishedAt ?? null,
      cover: relId(th.cover),
      title: { th: th.title ?? '', en: en.title ?? '' },
      excerpt: { th: th.excerpt ?? '', en: en.excerpt ?? '' },
      body: { th: bth.blocks, en: ben.blocks },
      bodyDirty: { th: false, en: false },
      seoTitle: { th: th.seo?.title ?? '', en: en.seo?.title ?? '' },
      seoDescription: { th: th.seo?.description ?? '', en: en.seo?.description ?? '' },
    }
  }

  return <ArticleEditor lang={s.lang} value={value} library={library} lossy={lossy} />
}
