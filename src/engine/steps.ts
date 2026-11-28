/**
 * Lógica pura de la guía (spec §5.2, F1.3–F1.8, F1.13): condiciones, flags, casillas y progreso.
 */
import type { Condition, StepDef, StepPhase } from './types'

export type Flags = Readonly<Record<string, boolean>>

export function evalCondition(cond: Condition | undefined, flags: Flags): boolean {
  if (!cond) return true
  if ('flag' in cond) return flags[cond.flag] === true
  if ('all' in cond) return cond.all.every((c) => evalCondition(c, flags))
  if ('any' in cond) return cond.any.some((c) => evalCondition(c, flags))
  return !evalCondition(cond.not, flags)
}

/** Flags que aparecen en una condición, en orden de aparición y sin repetir. */
export function conditionFlags(cond: Condition | undefined, out: string[] = []): string[] {
  if (!cond) return out
  if ('flag' in cond) {
    if (!out.includes(cond.flag)) out.push(cond.flag)
  } else if ('all' in cond) cond.all.forEach((c) => conditionFlags(c, out))
  else if ('any' in cond) cond.any.forEach((c) => conditionFlags(c, out))
  else conditionFlags(cond.not, out)
  return out
}

/** Flags usados por un conjunto de pasos (para mostrar las preguntas al inicio de la fase). */
export function flagsForSteps(steps: readonly StepDef[]): string[] {
  const out: string[] = []
  for (const s of steps) conditionFlags(s.when, out)
  return out
}

export interface DerivedFlagsInput {
  turn: number
  storyTrack: boolean
  battleEvents: boolean
  hasVictoryCondition: boolean
}

/**
 * Flags que v1 ya puede deducir de los ajustes de la campaña y del número de turno,
 * sin preguntar al jugador.
 */
export function derivedFlags(input: DerivedFlagsInput): Record<string, boolean> {
  return {
    'every-third-turn': input.turn > 0 && input.turn % 3 === 0,
    'story-track': input.storyTrack,
    'battle-events': input.battleEvents,
    'victory-condition': input.hasVictoryCondition,
  }
}

export const DERIVED_FLAGS: readonly string[] = Object.keys(
  derivedFlags({ turn: 0, storyTrack: false, battleEvents: false, hasVictoryCondition: false }),
)

export interface SlotContext {
  crewSize: number
}

export const MAX_ROUNDS = 8

/** Número de casillas de un paso (F1.5). Por baja: como mucho, toda la tripulación desplegada. */
export function slotCount(step: StepDef, ctx: SlotContext): number {
  switch (step.repeat) {
    case 'per-crew':
    case 'per-casualty':
      return ctx.crewSize
    case 'per-round':
      return MAX_ROUNDS
    default:
      return 1
  }
}

export type Checked = Readonly<Record<string, readonly boolean[]>>

export function isStepDone(step: StepDef, checked: Checked, ctx: SlotContext): boolean {
  const slots = checked[step.id] ?? []
  if (step.repeat === 'per-round' || step.repeat === 'per-casualty') return slots.some(Boolean)
  const n = slotCount(step, ctx)
  for (let i = 0; i < n; i++) if (!slots[i]) return false
  return true
}

/** Primera casilla libre, o undefined si están todas marcadas. */
export function nextFreeSlot(step: StepDef, checked: Checked, ctx: SlotContext): number | undefined {
  const slots = checked[step.id] ?? []
  const n = slotCount(step, ctx)
  for (let i = 0; i < n; i++) if (!slots[i]) return i
  return undefined
}

export interface PhaseProgress {
  done: number
  total: number
}

/** "9 de 17 pasos" (F1.8): cuenta los pasos aplicables y no opcionales. */
export function phaseProgress(
  steps: readonly StepDef[],
  flags: Flags,
  checked: Checked,
  ctx: SlotContext,
): PhaseProgress {
  let done = 0
  let total = 0
  for (const s of steps) {
    if (s.optional || !evalCondition(s.when, flags)) continue
    total++
    if (isStepDone(s, checked, ctx)) done++
  }
  return { done, total }
}

export interface Section {
  title: string
  steps: StepDef[]
}

/** Agrupa pasos en secciones conservando el orden del contenido. */
export function groupBySection(steps: readonly StepDef[]): Section[] {
  const out: Section[] = []
  for (const s of steps) {
    const last = out[out.length - 1]
    if (last && last.title === s.section) last.steps.push(s)
    else out.push({ title: s.section, steps: [s] })
  }
  return out
}

export function stepsForPhases(steps: readonly StepDef[], phases: readonly StepPhase[]): StepDef[] {
  return steps.filter((s) => phases.includes(s.phase))
}

export interface ColumnContext {
  stepId?: string
  flags: Flags
}

/**
 * Columna preseleccionada de una tabla multicolumna según el contexto (F1.13).
 * Los ids de columna son los del contenido: `opportunity-patron`, `rival`, `quest`, `unknown-rival`…
 */
export function suggestColumn(columnIds: readonly string[], ctx: ColumnContext): string | undefined {
  const has = (id: string) => columnIds.includes(id)
  const prefs: string[] = []
  if (ctx.stepId === 'creation.start.rivals') prefs.push('unknown-rival')
  if (ctx.flags['quest-battle']) prefs.push('quest')
  if (ctx.flags['rival-battle']) prefs.push('rival', 'unknown-rival')
  if (ctx.flags['patron-job']) prefs.push('patron', 'opportunity-patron')
  prefs.push('opportunity', 'opportunity-patron')
  return prefs.find(has) ?? columnIds[0]
}
