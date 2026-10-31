// CSV for the backoffice exports: UTF-8 with a BOM so Excel reads Thai correctly, CRLF lines,
// every text cell quoted. Text that a spreadsheet would run as a formula (= + - @ tab CR) gets a
// leading ' so it shows as text. Numbers are written as plain numbers.
export type CsvCell = string | number | null | undefined

const FORMULA_START = /^[=+\-@\t\r]/

export function csvCell(v: CsvCell) {
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : ''
  let s = v ?? ''
  if (FORMULA_START.test(s)) s = `'${s}`
  return `"${s.replace(/"/g, '""')}"`
}

export const toCsv = (rows: CsvCell[][]) =>
  `﻿${rows.map((r) => r.map(csvCell).join(',')).join('\r\n')}\r\n`

export function csvResponse(rows: CsvCell[][], filename: string) {
  return new Response(toCsv(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
