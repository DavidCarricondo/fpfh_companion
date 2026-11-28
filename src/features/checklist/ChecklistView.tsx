/**
 * Lista de pasos + panel de tabla (+ diario en vivo en portátil). Spec §7 y F1.3–F1.9.
 */
import * as Dialog from '@radix-ui/react-dialog'
import { useState } from 'react'
import { getTable, steps as allSteps } from '../../content'
import {
  DERIVED_FLAGS,
  evalCondition,
  flagsForSteps,
  groupBySection,
  phaseProgress,
  slotCount,
  stepsForPhases,
  suggestColumn,
} from '../../engine/steps'
import type { StepDef, StepPhase } from '../../engine/types'
import { GlossaryText } from '../../components/GlossaryText'
import { formatPages } from '../../components/format'
import { TABLET_UP, useMediaQuery } from '../../components/useMediaQuery'
import { useAppStore } from '../../store/campaign'
import type { Campaign } from '../../store/types'
import { useUiStore } from '../../store/ui'
import { LogList } from '../log/LogList'
import { TablePanel } from '../tables/TablePanel'
import { flagLabel } from './flags'
import { StepItem } from './StepItem'
import { useTurnFlags } from './useTurnFlags'

interface Props {
  campaign: Campaign
  turn: number
  phases: readonly StepPhase[]
  /** Flags que interesa preguntar aquí aunque ningún paso de la vista los use (p. ej. tipo de batalla). */
  extraFlags?: readonly string[]
}

export function ChecklistView({ campaign, turn, phases, extraFlags = [] }: Props) {
  const viewKey = `${campaign.id}:${turn}:${phases.join('+')}`
  const steps = stepsForPhases(allSteps, phases)
  const { progress, flags } = useTurnFlags(campaign, turn)
  const ctx = { crewSize: campaign.settings.crewSize }

  const setStepSlot = useAppStore((s) => s.setStepSlot)
  const setFlag = useAppStore((s) => s.setFlag)
  const inapplicable = useUiStore((s) => s.inapplicable)
  const setInapplicable = useUiStore((s) => s.setInapplicable)
  const activeId = useUiStore((s) => s.activeStep[viewKey])
  const setActiveStep = useUiStore((s) => s.setActiveStep)
  const lastTable = useUiStore((s) => s.lastTable)
  const setLastTable = useUiStore((s) => s.setLastTable)

  const isTablet = useMediaQuery(TABLET_UP)
  const [sheetOpen, setSheetOpen] = useState(false)

  const askFlags = [...new Set([...flagsForSteps(steps), ...extraFlags])].filter(
    (f) => !DERIVED_FLAGS.includes(f),
  )
  const { done, total } = phaseProgress(steps, flags, progress.checked, ctx)
  const active = steps.find((s) => s.id === activeId)
  const activeTable = active ? (lastTable[active.id] ?? active.tables?.[0]) : undefined

  const activate = (step: StepDef) => {
    setActiveStep(viewKey, step.id)
    if (!isTablet && step.tables?.length) setSheetOpen(true)
  }
  const openTable = (step: StepDef, tableId: string) => {
    setActiveStep(viewKey, step.id)
    setLastTable(step.id, tableId)
    if (!isTablet) setSheetOpen(true)
  }

  const panel = active ? (
    <div className="space-y-4">
      <div className="space-y-1 border-b border-slate-800 pb-3">
        <p className="text-sm text-slate-400">
          {active.section} · {formatPages(active.page)}
        </p>
        <h2 className="text-lg font-semibold">{active.title}</h2>
        <p className="text-slate-300">
          <GlossaryText text={active.body} />
        </p>
        {(active.tables?.length ?? 0) > 1 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {active.tables!.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => openTable(active, id)}
                className={`chip ${
                  activeTable === id
                    ? 'border-sky-500 bg-sky-900/60 text-sky-100'
                    : 'border-slate-700 text-slate-300'
                }`}
              >
                {getTable(id)?.name ?? id}
              </button>
            ))}
          </div>
        )}
      </div>
      {activeTable ? (
        <TablePanel
          key={`${active.id}:${activeTable}`}
          tableId={activeTable}
          context={{ campaignId: campaign.id, turn, phase: active.phase, step: active }}
          suggestColumn={(t) =>
            suggestColumn(
              (t.columns ?? []).map((c) => c.id),
              { stepId: active.id, flags },
            )
          }
        />
      ) : (
        <p className="text-slate-400">Este paso no tiene tabla: márcalo en la lista cuando lo hayas hecho.</p>
      )}
    </div>
  ) : (
    <p className="text-slate-400">Toca un paso o una de sus tablas para abrirla aquí.</p>
  )

  return (
    <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[2fr_3fr] xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_minmax(0,1.3fr)]">
      <div className="min-h-0 space-y-4 md:overflow-y-auto md:pr-2">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-slate-400" aria-live="polite">
            {done} de {total} pasos
          </p>
          <div className="h-2 min-w-24 flex-1 overflow-hidden rounded bg-slate-800" aria-hidden>
            <div className="h-full bg-sky-600" style={{ width: total ? `${(100 * done) / total}%` : '0%' }} />
          </div>
          <label className="flex min-h-11 items-center gap-2 text-sm text-slate-400">
            <input
              type="checkbox"
              checked={inapplicable === 'hide'}
              onChange={(e) => setInapplicable(e.target.checked ? 'hide' : 'dim')}
              className="size-5 accent-sky-500"
            />
            Ocultar no aplicables
          </label>
        </div>

        {askFlags.length > 0 && (
          <fieldset className="space-y-1 rounded-lg border border-slate-800 p-3">
            <legend className="px-1 text-sm text-slate-400">Este turno</legend>
            {askFlags.map((flag) => {
              const label = flagLabel(flag)
              const on = !!flags[flag]
              return (
                <div key={flag} className="flex items-center justify-between gap-3">
                  <span className="text-sm">{label}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label={label}
                    onClick={() => setFlag({ campaignId: campaign.id, turn, flag, label, value: !on })}
                    className={`min-h-11 min-w-16 rounded-full px-3 text-sm font-medium ${
                      on ? 'bg-sky-700 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {on ? 'Sí' : 'No'}
                  </button>
                </div>
              )
            })}
          </fieldset>
        )}

        {groupBySection(steps).map((section) => {
          const visible = section.steps.filter((s) => inapplicable === 'dim' || evalCondition(s.when, flags))
          if (visible.length === 0) return null
          return (
            <section key={section.title} aria-label={section.title}>
              <h3 className="mb-1 text-sm font-semibold tracking-wide text-orange-400 uppercase">
                {section.title}
              </h3>
              <ul className="space-y-1">
                {visible.map((step) => (
                  <StepItem
                    key={step.id}
                    step={step}
                    slots={slotCount(step, ctx)}
                    checked={progress.checked[step.id] ?? []}
                    applicable={evalCondition(step.when, flags)}
                    active={step.id === activeId}
                    {...(step.id === activeId && activeTable ? { activeTable } : {})}
                    onToggle={(slot, value) =>
                      setStepSlot({ campaignId: campaign.id, turn, step, slot, value })
                    }
                    onActivate={() => activate(step)}
                    onOpenTable={(id) => openTable(step, id)}
                  />
                ))}
              </ul>
            </section>
          )
        })}
      </div>

      {isTablet ? (
        <div
          className="min-h-0 overflow-y-auto rounded-xl border border-slate-800 p-4"
          aria-label="Panel de tabla"
        >
          {panel}
        </div>
      ) : (
        <Dialog.Root open={sheetOpen} onOpenChange={setSheetOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60" />
            <Dialog.Content
              aria-describedby={undefined}
              className="fixed inset-x-0 bottom-0 z-40 max-h-[92dvh] overflow-y-auto rounded-t-2xl border-t border-slate-700 bg-slate-950 p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <Dialog.Title className="text-sm text-slate-400">{active?.title ?? 'Tabla'}</Dialog.Title>
                <Dialog.Close className="btn-ghost" aria-label="Cerrar">
                  ✕
                </Dialog.Close>
              </div>
              {panel}
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}

      <aside className="hidden min-h-0 overflow-y-auto xl:block" aria-label="Diario en vivo">
        <h2 className="mb-2 text-sm font-semibold tracking-wide text-slate-400 uppercase">Diario</h2>
        <LogList campaignId={campaign.id} newestFirst compact />
      </aside>
    </div>
  )
}
