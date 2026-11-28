/**
 * Tarjeta de resultado (spec §7 ResultCard, F1.12, F1.14).
 */
import { formatBreakdown, type RollResolution } from '../../engine/lookup'
import type { TableDef, TableRow } from '../../engine/types'
import { formatRange } from '../../components/format'
import { nextLabel } from './nextLabel'

export function RowFields({ table, row }: { table: TableDef; row: TableRow }) {
  const fields = row.fields
  if (!fields || Object.keys(fields).length === 0) return null
  const defs = table.fieldDefs ?? []
  const ordered = [
    ...defs.filter((d) => d.id in fields),
    ...Object.keys(fields)
      .filter((k) => !defs.some((d) => d.id === k))
      .map((k) => ({ id: k, label: k })),
  ]
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
      {ordered.map((d) => (
        <div key={d.id} className="contents">
          <dt className="text-slate-400">{d.label}</dt>
          <dd className="font-medium">{fields[d.id]}</dd>
        </div>
      ))}
    </dl>
  )
}

interface Props {
  table: TableDef
  res: RollResolution
  /** Hay campaña a la que anotar. */
  canConfirm: boolean
  confirmed: boolean
  note: string
  onNoteChange(note: string): void
  onConfirm(): void
  onFollow(index: number): void
}

export function ResultCard({
  table,
  res,
  canConfirm,
  confirmed,
  note,
  onNoteChange,
  onConfirm,
  onFollow,
}: Props) {
  const { row, range } = res.match
  const mustConfirm = canConfirm && !confirmed
  return (
    <article
      aria-label="Resultado"
      className="space-y-3 rounded-xl border border-sky-800 bg-slate-900 p-4 shadow-lg"
    >
      <header className="flex items-baseline gap-3">
        <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-sm text-slate-300">
          {formatRange(range)}
        </span>
        <h3 className="text-xl font-semibold text-slate-50">{row.result}</h3>
      </header>
      {res.modified.modifiers.length > 0 && (
        <p className="font-mono text-sm text-slate-400">{formatBreakdown(res.modified)}</p>
      )}
      {row.detail && <p className="text-slate-200">{row.detail}</p>}
      <RowFields table={table} row={row} />
      {(row.page !== undefined || row.errata) && (
        <p className="text-sm text-slate-400">
          {row.page !== undefined && <>Ver p. {row.page}. </>}
          {row.errata && <>Errata: {row.errata}</>}
        </p>
      )}

      {res.next.length > 0 && (
        <div className="space-y-2 rounded-lg border border-sky-900 bg-sky-950/40 p-3">
          <p className="text-sm text-sky-200">
            Encadena{res.next.length > 1 ? ` (${res.next.length} tiradas)` : ''}
            {mustConfirm ? ' · confirma para seguir' : ''}
          </p>
          <div className="flex flex-wrap gap-2">
            {res.next.map((n, i) => (
              <button
                key={i}
                type="button"
                className="btn-secondary"
                disabled={mustConfirm}
                onClick={() => onFollow(i)}
              >
                Siguiente: {nextLabel(n)}
                {res.next.length > 1 ? ` (${i + 1}/${res.next.length})` : ''} →
              </button>
            ))}
          </div>
        </div>
      )}

      {canConfirm && (
        <div className="space-y-2">
          <label className="block text-sm text-slate-400">
            Nota (opcional)
            <textarea
              value={note}
              disabled={confirmed}
              onChange={(e) => onNoteChange(e.target.value)}
              rows={2}
              className="field mt-1 block w-full py-2"
            />
          </label>
          <button type="button" className="btn-primary w-full" disabled={confirmed} onClick={onConfirm}>
            {confirmed ? '✓ Anotado en el diario' : 'Confirmar'}
          </button>
        </div>
      )}
    </article>
  )
}
