/**
 * "Ver tabla entera" con la fila resultante resaltada (F1.12). También muestra las tablas de referencia.
 */
import { useEffect, useRef } from 'react'
import { rowsForColumn } from '../../engine/lookup'
import type { TableDef } from '../../engine/types'
import { formatRange } from '../../components/format'
import { RowFields } from './ResultCard'

interface Props {
  table: TableDef
  column?: string
  highlight?: number
}

export function FullTable({ table, column, highlight }: Props) {
  const ref = useRef<HTMLTableRowElement>(null)
  useEffect(() => {
    ref.current?.scrollIntoView?.({ block: 'nearest' })
  }, [highlight])

  const rows = table.dice
    ? rowsForColumn(table, column)
    : table.rows.map((row, rowIndex) => ({ row, rowIndex, range: undefined }))

  return (
    <div className="max-h-[60vh] overflow-auto rounded-lg border border-slate-800">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-slate-900 text-slate-400">
          <tr>
            {table.dice && <th className="w-20 px-3 py-2 font-medium">Dado</th>}
            <th className="px-3 py-2 font-medium">Resultado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {rows.map(({ row, rowIndex, range }) => {
            const on = rowIndex === highlight
            return (
              <tr
                key={rowIndex}
                ref={on ? ref : undefined}
                aria-current={on ? 'true' : undefined}
                className={on ? 'bg-sky-900/50' : ''}
              >
                {range && (
                  <td className="px-3 py-2 align-top font-mono text-slate-300">{formatRange(range)}</td>
                )}
                <td className="space-y-1 px-3 py-2">
                  <p className="font-medium text-slate-100">{row.result}</p>
                  {row.detail && <p className="text-slate-400">{row.detail}</p>}
                  <RowFields table={table} row={row} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
