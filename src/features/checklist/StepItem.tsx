/**
 * Un paso de la guía (spec §7 StepItem, F1.4, F1.5, F1.9).
 */
import { getTable } from '../../content'
import type { StepDef } from '../../engine/types'
import { GlossaryText } from '../../components/GlossaryText'
import { formatPages } from '../../components/format'

interface Props {
  step: StepDef
  slots: number
  checked: readonly boolean[]
  applicable: boolean
  active: boolean
  activeTable?: string
  onToggle(slot: number, value: boolean): void
  onActivate(): void
  onOpenTable(tableId: string): void
}

export function StepItem({
  step,
  slots,
  checked,
  applicable,
  active,
  activeTable,
  onToggle,
  onActivate,
  onOpenTable,
}: Props) {
  const done = step.repeat ? checked.slice(0, slots).some(Boolean) : !!checked[0]
  return (
    <li
      aria-current={active ? 'step' : undefined}
      className={`rounded-lg border p-3 transition-colors ${
        active ? 'border-sky-600 bg-slate-900' : 'border-transparent hover:bg-slate-900/60'
      } ${applicable ? '' : 'opacity-40'}`}
    >
      <div className="flex items-start gap-3">
        {slots === 1 && (
          <input
            type="checkbox"
            aria-label={`Hecho: ${step.title}`}
            checked={done}
            onChange={(e) => onToggle(0, e.target.checked)}
            className="mt-0.5 size-7 shrink-0 accent-sky-500"
          />
        )}
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onActivate}
            className="block w-full text-left focus-visible:outline-none"
            aria-expanded={active}
          >
            <span className={`font-medium ${done && !step.repeat ? 'text-slate-400 line-through' : ''}`}>
              {step.title}
            </span>
            <span className="ml-2 text-xs whitespace-nowrap text-slate-500">{formatPages(step.page)}</span>
            {step.optional && (
              <span className="ml-2 rounded bg-slate-800 px-1.5 text-xs text-slate-400">opcional</span>
            )}
          </button>
          <p className={`mt-1 text-sm text-slate-300 ${active ? '' : 'line-clamp-2'}`}>
            <GlossaryText text={step.body} />
          </p>
          {slots > 1 && (
            <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label={`Casillas: ${step.title}`}>
              {Array.from({ length: slots }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  role="checkbox"
                  aria-checked={!!checked[i]}
                  aria-label={`${step.title} ${i + 1}`}
                  onClick={() => onToggle(i, !checked[i])}
                  className={`size-11 rounded-md border font-mono text-sm ${
                    checked[i] ? 'border-sky-500 bg-sky-700 text-white' : 'border-slate-600 text-slate-400'
                  }`}
                >
                  {checked[i] ? '✓' : i + 1}
                </button>
              ))}
            </div>
          )}
          {step.tables && step.tables.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {step.tables.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onOpenTable(id)}
                  className={`chip ${
                    active && activeTable === id
                      ? 'border-sky-500 bg-sky-900/60 text-sky-100'
                      : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {getTable(id)?.name ?? id}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </li>
  )
}
