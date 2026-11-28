/**
 * Panel de tabla (spec §7 TablePanel, F1.9–F1.16): dado → resultado → confirmar, con encadenado.
 */
import { useMemo, useState } from 'react'
import { getTable } from '../../content'
import { formatDice, rollDice, type Rng } from '../../engine/dice'
import { LookupError, resolveRoll, type RollResolution } from '../../engine/lookup'
import type { StepDef, StepPhase, TableDef } from '../../engine/types'
import { cryptoRng } from '../../lib/random'
import { DiceInput } from '../../components/DiceInput'
import { draftFromFaces, emptyDraft, readDraft, type DiceDraft } from '../../components/diceDraft'
import { formatPages } from '../../components/format'
import { useAppStore } from '../../store/campaign'
import { useUiStore } from '../../store/ui'
import { FullTable } from './FullTable'
import { nextLabel } from './nextLabel'
import { ResultCard } from './ResultCard'

export interface TableContext {
  campaignId: string
  turn: number
  phase?: StepPhase
  step?: StepDef
}

interface Pending {
  tableId: string
  column?: string
  label?: string
  /** Entrada del diario de la que cuelga (si se confirmó). */
  parentId?: string
}

interface Props {
  tableId: string
  /** Si hay contexto de campaña, el resultado se puede confirmar en el diario. */
  context?: TableContext
  /** Columna preseleccionada para tablas multicolumna (F1.13). */
  suggestColumn?: (table: TableDef) => string | undefined
  rng?: Rng
}

export function TablePanel({ tableId, context, suggestColumn, rng = cryptoRng }: Props) {
  const [current, setCurrent] = useState<Pending>({ tableId })
  const [queue, setQueue] = useState<Pending[]>([])
  const [seq, setSeq] = useState(0)

  const open = (p: Pending, rest: Pending[]) => {
    setCurrent(p)
    setQueue(rest)
    setSeq((n) => n + 1)
  }

  const table = getTable(current.tableId)
  if (!table) return <p className="text-red-400">La tabla “{current.tableId}” no existe.</p>

  const isRoot = current.tableId === tableId && !current.parentId && seq === 0

  return (
    <div className="space-y-4">
      {(!isRoot || queue.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {queue.length > 0 && (
            <button type="button" className="btn-secondary" onClick={() => open(queue[0]!, queue.slice(1))}>
              Pendiente: {queue[0]!.label ?? getTable(queue[0]!.tableId)?.name}
              {queue.length > 1 ? ` (+${queue.length - 1})` : ''} →
            </button>
          )}
          {!isRoot && (
            <button type="button" className="btn-ghost" onClick={() => open({ tableId }, [])}>
              ↺ Volver a {getTable(tableId)?.name}
            </button>
          )}
        </div>
      )}
      <RollView
        key={`${current.tableId}#${seq}`}
        table={table}
        pending={current}
        context={context}
        suggestColumn={suggestColumn}
        rng={rng}
        onFollow={(res, index, parentId) => {
          const mapped: Pending[] = res.next.map((n) => ({
            tableId: n.tableId,
            ...(n.column !== undefined ? { column: n.column } : {}),
            label: nextLabel(n),
            ...(parentId ? { parentId } : {}),
          }))
          open(mapped[index]!, [...mapped.filter((_, i) => i !== index), ...queue])
        }}
      />
    </div>
  )
}

interface RollViewProps {
  table: TableDef
  pending: Pending
  context?: TableContext
  suggestColumn?: (table: TableDef) => string | undefined
  rng: Rng
  onFollow(res: RollResolution, index: number, parentId?: string): void
}

function RollView({ table, pending, context, suggestColumn, rng, onFollow }: RollViewProps) {
  const confirmRoll = useAppStore((s) => s.confirmRoll)
  const undoEntry = useAppStore((s) => s.undoEntry)
  const showToast = useUiStore((s) => s.showToast)

  const columns = table.columns ?? []
  const [column, setColumn] = useState<string | undefined>(
    () => pending.column ?? (columns.length ? (suggestColumn?.(table) ?? columns[0]!.id) : undefined),
  )
  const [draft, setDraft] = useState<DiceDraft | null>(() => (table.dice ? emptyDraft(table.dice) : null))
  const [source, setSource] = useState<'manual' | 'auto'>('manual')
  const [modValue, setModValue] = useState(0)
  const [modLabel, setModLabel] = useState('')
  const [note, setNote] = useState('')
  const [confirmedId, setConfirmedId] = useState<string>()
  // Si la entrada se deshace (desde el aviso o el diario), la tarjeta vuelve a poder confirmarse.
  const confirmed = useAppStore((s) => !!confirmedId && s.log.some((e) => e.id === confirmedId && !e.undone))
  const [showFull, setShowFull] = useState(!table.dice)
  const [showNotes, setShowNotes] = useState(false)

  const outcome = useMemo((): { res?: RollResolution; error?: string } => {
    const parsed = table.dice && draft ? readDraft(table.dice, draft) : undefined
    if (!table.dice || parsed?.kind !== 'ok') return {}
    try {
      return {
        res: resolveRoll(table, {
          ...(parsed.dice ? { dice: parsed.dice } : {}),
          ...(parsed.natural !== undefined ? { natural: parsed.natural } : {}),
          modifiers: modValue ? [{ value: modValue, label: modLabel.trim() }] : [],
          ...(column !== undefined ? { column } : {}),
        }),
      }
    } catch (e) {
      if (e instanceof LookupError) return { error: e.message }
      throw e
    }
  }, [table, draft, modValue, modLabel, column])
  const res = outcome.res

  const resetConfirmation = () => {
    setConfirmedId(undefined)
    setNote('')
  }

  const changeDraft = (d: DiceDraft) => {
    setDraft(d)
    setSource('manual')
    resetConfirmation()
  }

  const rollForMe = () => {
    if (!table.dice) return
    setDraft(draftFromFaces(table.dice, rollDice(table.dice, rng).dice))
    setSource('auto')
    resetConfirmation()
  }

  const confirm = () => {
    if (!context || !res) return
    const step = pending.parentId ? undefined : context.step
    const id = confirmRoll({
      campaignId: context.campaignId,
      turn: context.turn,
      ...(context.phase ? { phase: context.phase } : {}),
      ...(context.step ? { step: context.step } : {}),
      // Solo la tirada raíz marca el paso, y solo si es su única tabla (F1.16).
      markStep: step?.tables?.length === 1 && step.tables[0] === table.id,
      table,
      resolution: res,
      source,
      note,
      ...(pending.parentId ? { parentId: pending.parentId } : {}),
    })
    setConfirmedId(id)
    showToast({
      text: `Anotado: ${table.name} → ${res.match.row.result}`,
      action: {
        label: 'Deshacer',
        run: () => undoEntry(id),
      },
    })
  }

  return (
    <section aria-label={table.name} className="space-y-4">
      <header className="space-y-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-2xl font-semibold">{table.name}</h2>
          <span className="text-slate-400">
            {table.dice ? formatDice(table.dice) : 'Referencia'} · {formatPages(table.page)}
          </span>
          {!table.verified && (
            <span
              className="rounded bg-amber-900/60 px-2 py-0.5 text-xs text-amber-200"
              title="Sin revisar contra el libro"
            >
              sin verificar
            </span>
          )}
        </div>
        {pending.label && <p className="text-sm text-sky-300">↳ {pending.label}</p>}
        {table.notes && (
          <div>
            <button type="button" className="btn-ghost -ml-3 text-sm" onClick={() => setShowNotes((v) => !v)}>
              {showNotes ? '▾' : '▸'} Reglas de la tabla
            </button>
            {showNotes && <p className="text-sm text-slate-300">{table.notes}</p>}
          </div>
        )}
      </header>

      {columns.length > 0 && (
        <div role="radiogroup" aria-label="Columna" className="flex flex-wrap gap-2">
          {columns.map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={column === c.id}
              onClick={() => {
                setColumn(c.id)
                resetConfirmation()
              }}
              className={`chip ${
                column === c.id
                  ? 'border-sky-500 bg-sky-900/60 text-sky-100'
                  : 'border-slate-700 text-slate-300'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {/* En paneles anchos, el resultado va al lado del teclado para verlo sin desplazarse. */}
      <div className="@container">
        <div className="grid items-start gap-4 @xl:grid-cols-[auto_minmax(0,1fr)]">
          {table.dice && draft && <DiceInput spec={table.dice} value={draft} onChange={changeDraft} />}
          <div className="min-w-0 space-y-4">
            {table.dice && (
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className="btn-secondary" onClick={rollForMe}>
                  Tirar por mí
                </button>
                <fieldset className="flex flex-wrap items-center gap-2">
                  <legend className="sr-only">Modificador</legend>
                  <button
                    type="button"
                    className="key h-11 w-11 text-xl"
                    aria-label="Restar 1 al modificador"
                    onClick={() => {
                      setModValue((v) => v - 1)
                      resetConfirmation()
                    }}
                  >
                    −
                  </button>
                  <output aria-label="Modificador" className="w-10 text-center font-mono text-xl">
                    {modValue > 0 ? `+${modValue}` : modValue}
                  </output>
                  <button
                    type="button"
                    className="key h-11 w-11 text-xl"
                    aria-label="Sumar 1 al modificador"
                    onClick={() => {
                      setModValue((v) => v + 1)
                      resetConfirmation()
                    }}
                  >
                    +
                  </button>
                  {modValue !== 0 && (
                    <input
                      aria-label="Motivo del modificador"
                      placeholder="Motivo (Savvy…)"
                      value={modLabel}
                      onChange={(e) => {
                        setModLabel(e.target.value)
                        resetConfirmation()
                      }}
                      className="field w-40"
                    />
                  )}
                </fieldset>
              </div>
            )}

            {outcome.error && <p className="text-red-400">{outcome.error}</p>}

            {res ? (
              <ResultCard
                table={table}
                res={res}
                canConfirm={!!context}
                confirmed={confirmed}
                note={note}
                onNoteChange={setNote}
                onConfirm={confirm}
                onFollow={(i) => onFollow(res, i, confirmed ? confirmedId : undefined)}
              />
            ) : (
              table.dice && (
                <p className="rounded-xl border border-dashed border-slate-700 p-4 text-slate-500">
                  Escribe el resultado del dado para ver la fila.
                </p>
              )
            )}
          </div>
        </div>
      </div>

      {table.dice && (
        <button type="button" className="btn-ghost -ml-3" onClick={() => setShowFull((v) => !v)}>
          {showFull ? '▾ Ocultar tabla' : '▸ Ver tabla entera'}
        </button>
      )}
      {showFull && (
        <FullTable
          table={table}
          {...(column !== undefined ? { column } : {})}
          {...(res ? { highlight: res.match.rowIndex } : {})}
        />
      )}
    </section>
  )
}
