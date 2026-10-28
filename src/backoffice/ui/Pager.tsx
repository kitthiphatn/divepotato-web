import Link from 'next/link'

import { translator, type Lang } from '../i18n'
import { Icon } from '../icons'

// Previous/next paging under a list (page numbers start at 1)
export function Pager({
  lang,
  page,
  pages,
  total,
  href,
}: {
  lang: Lang
  page: number
  pages: number
  total: number
  href: (page: number) => string
}) {
  const L = translator(lang)
  if (pages <= 1)
    return (
      <p className="hint pager">
        {total} {L('รายการ', 'items')}
      </p>
    )
  return (
    <nav className="pager" aria-label={L('หน้า', 'Pages')}>
      {page > 1 ? (
        <Link className="btn o sm" href={href(page - 1)} scroll={false}>
          <Icon name="back" />
          {L('ก่อนหน้า', 'Previous')}
        </Link>
      ) : (
        <span />
      )}
      <span className="muted small num">
        {L(`หน้า ${page} จาก ${pages}`, `Page ${page} of ${pages}`)} · {total}{' '}
        {L('รายการ', 'items')}
      </span>
      {page < pages ? (
        <Link className="btn o sm" href={href(page + 1)} scroll={false}>
          {L('ถัดไป', 'Next')}
          <Icon name="chev" />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  )
}
