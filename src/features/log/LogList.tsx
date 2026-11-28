/**
 * Diario agrupado por turno y fase (F1.18, F1.19). Exportar llega en M4.
 */
import { useState } from 'react'
import { useAppStore } from '../../store/campaign'
import { CREATION_TURN, type LogEntry } from '../../store/types'
import { PHASE_LABELS } from '../labels'

const UNDOABLE: ReadonlySet<LogEntry['kind']> = new Set(['roll', 'step-done', 'note'])

interface Group {
  turn: number
  phase: string
  entries: LogEntry[]
}

function groupEntries(entries: LogEntry[]): Group[] {
  const out: Group[] = []
  for (const e of entries) {
    const phase = e.phase ? PHASE_LABELS[e.phase] : 'General'
    const last = out[out.length - 1]
    if (last && last.turn === e.turn && last.phase === phase) last.entries.push(e)
    else out.push({ turn: e.turn, phase, entries: [e] })
  }
  return out
}

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

interface Props {
  campaignId: string
  newestFirst?: boolean
  compact?: boolean
}

export function LogList({ campaignId, newestFirst = false, compact = false }: Props) {
  const all = useAppStore((s) => s.log)
  const entries = all.filter((e) => e.campaignId === campaignId)
  if (entries.length === 0) return <p className="text-sm text-slate-400">Aún no hay entradas.</p>
  const groups = groupEntries(newestFirst ? [...entries].reverse() : entries)
  return (
    <div className="space-y-4">
      {groups.map((g, i) => (
        <section key={i} aria-label={`Turno ${g.turn} · ${g.phase}`}>
          <h3 className={`mb-1 font-semibold text-slate-300 ${compact ? 'text-xs' : 'text-sm'}`}>
            {g.turn === CREATION_TURN ? 'Creación' : `Turno ${g.turn} · ${g.phase}`}
          </h3>
          <ul className="space-y-1">
            {g.entries.map((e) => (
              <LogItem key={e.id} entry={e} compact={compact} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function LogItem({ entry: e, compact }: { entry: LogEntry; compact: boolean }) {
  const undoEntry = useAppStore((s) => s.undoEntry)
  const setEntryNote = useAppStore((s) => s.setEntryNote)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(e.note ?? '')
  const muted = e.kind === 'state-change' || e.kind === 'step-done'

  return (
    <li
      className={`rounded-md px-2 py-1 ${e.parentId ? 'ml-4 border-l border-slate-700' : ''} ${
        compact ? 'text-xs' : 'text-sm'
      } ${e.undone ? 'text-slate-500 line-through' : muted ? 'text-slate-400' : 'text-slate-100'}`}
    >
      <div className="flex items-start gap-2">
        <span className="shrink-0 font-mono text-slate-500">{time(e.at)}</span>
        <span className="flex-1">
          {e.roll?.source === 'auto' && <span title="Tirada automática">🎲 </span>}
          {e.text}
        </span>
        {!e.undone && !compact && (
          <span className="flex shrink-0 gap-1">
            {e.kind !== 'note' && (
              <button
                type="button"
                className="btn-ghost min-h-9 px-2 text-xs"
                onClick={() => setEditing((v) => !v)}
              >
                Nota
              </button>
            )}
            {UNDOABLE.has(e.kind) && (
              <button
                type="button"
                className="btn-ghost min-h-9 px-2 text-xs"
                onClick={() => undoEntry(e.id)}
              >
                Deshacer
              </button>
            )}
          </span>
        )}
      </div>
      {e.note && !editing && <p className="mt-0.5 ml-12 text-slate-300 italic no-underline">“{e.note}”</p>}
      {editing && (
        <form
          className="mt-1 ml-12 flex gap-2"
          onSubmit={(ev) => {
            ev.preventDefault()
            setEntryNote(e.id, draft)
            setEditing(false)
          }}
        >
          <input
            aria-label="Nota de la entrada"
            value={draft}
            onChange={(ev) => setDraft(ev.target.value)}
            className="field flex-1"
          />
          <button type="submit" className="btn-secondary">
            Guardar
          </button>
        </form>
      )}
    </li>
  )
}
