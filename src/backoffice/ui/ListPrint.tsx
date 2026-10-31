import Link from 'next/link'
import type { ReactNode } from 'react'

import { fdy, money, shopTime, todayYmd } from '../format'
import { translator, type Lang } from '../i18n'
import { Icon } from '../icons'
import type { ListTotals } from '../lists'
import { AutoPrint, PrintButton } from './PrintButton'

// `sum` puts that figure of the totals under the column
export type PrintCol = { label: string; num?: boolean; sum?: 'people' | 'total' | 'paid' | 'due' }

// Printable report of a list (bookings, shop orders) for "Export PDF": header with the shop,
// filter and time printed, the rows, then a totals row. The browser's print dialog saves it as
// PDF; the print CSS sets A4 landscape and repeats the table header on every page.
export function ListPrint({
  lang,
  title,
  phone,
  filter,
  backHref,
  cols,
  rows,
  totals,
  noun,
}: {
  lang: Lang
  title: string
  phone?: string | null
  filter: string
  backHref: string
  cols: PrintCol[]
  rows: { key: number; cells: ReactNode[] }[]
  totals: ListTotals
  // What a row is, for the totals row: "การจอง" / "bookings"
  noun: string
}) {
  const L = translator(lang)
  const now = new Date()
  // The totals row: a label up to the first summed column, then the sums under their columns
  const first = Math.max(
    0,
    cols.findIndex((c) => c.sum),
  )
  const sumText = (c: PrintCol) =>
    !c.sum ? '' : c.sum === 'people' ? String(totals.people) : money(totals[c.sum])
  return (
    <>
      <AutoPrint />
      <div className="mtool">
        <Link className="back" href={backHref}>
          <Icon name="back" />
          {L('กลับไปที่รายการ', 'Back to the list')}
        </Link>
        <div style={{ display: 'flex', gap: 10 }}>
          <span className="small muted" style={{ alignSelf: 'center' }}>
            {L(
              'บันทึกเป็น PDF: กดพิมพ์ แล้วเลือกเครื่องพิมพ์ "บันทึกเป็น PDF"',
              'To save as PDF: press Print and choose "Save as PDF" as the printer',
            )}
          </span>
          <PrintButton label={L('พิมพ์ / บันทึก PDF', 'Print / save PDF')} />
        </div>
      </div>
      <div className="paperwrap">
        <article className="paper lrep">
          <div className="mh">
            <div className="bn">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/backoffice/logo.png" alt="" />
              <div>
                <h2>{title}</h2>
                <small>
                  Dive Potato Scuba Diving · PADI Dive Center
                  {phone ? ` · ${L('โทร', 'Tel')} ${phone}` : ''}
                </small>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <small>
                {L('สร้างเมื่อ', 'Generated')} {fdy(todayYmd(), lang)} {shopTime(now)}
              </small>
              <br />
              <b>{filter}</b>
            </div>
          </div>
          {rows.length === 0 ? (
            <p className="note">{L('ไม่มีรายการตามตัวกรองนี้', 'No rows match this filter')}</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  {cols.map((c) => (
                    <th key={c.label} className={c.num ? 'r' : undefined}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.key}>
                    <td>{i + 1}</td>
                    {r.cells.map((c, j) => (
                      <td key={j} className={cols[j].num ? 'num r' : undefined}>
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="ptot">
                  <td colSpan={first + 1}>
                    {L('รวม', 'Total')} {totals.count} {noun}
                  </td>
                  {cols.slice(first).map((c) => (
                    <td key={c.label} className="num r">
                      {sumText(c)}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          )}
        </article>
      </div>
    </>
  )
}
