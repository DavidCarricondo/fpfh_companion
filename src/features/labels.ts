/**
 * Etiquetas de la interfaz (español) para grupos de tablas, fases y pestañas del turno.
 */
import type { StepPhase, TableGroup } from '../engine/types'

export const GROUP_LABELS: Record<TableGroup, string> = {
  creation: 'Creación',
  equipment: 'Equipo',
  travel: 'Viaje',
  world: 'Mundo',
  battle: 'Batalla',
  enemies: 'Enemigos',
  'post-battle': 'Post-batalla',
  loot: 'Botín',
  campaign: 'Campaña',
}

export const PHASE_LABELS: Record<StepPhase, string> = {
  creation: 'Creación',
  travel: 'Viaje',
  world: 'Mundo',
  'battle-setup': 'Batalla',
  battle: 'Batalla',
  'post-battle': 'Post-batalla',
  end: 'Cierre',
}

export interface TurnTab {
  id: string
  label: string
  phases: StepPhase[]
  /** Flags que interesa preguntar en la pestaña aunque ningún paso de ella los use. */
  extraFlags?: string[]
}

export const TURN_TABS: readonly TurnTab[] = [
  { id: 'travel', label: 'Viaje', phases: ['travel'] },
  { id: 'world', label: 'Mundo', phases: ['world'] },
  // El tipo de batalla decide la columna de las tablas multicolumna (F1.13).
  {
    id: 'battle',
    label: 'Batalla',
    phases: ['battle-setup', 'battle'],
    extraFlags: ['patron-job', 'quest-battle'],
  },
  { id: 'post', label: 'Post-batalla', phases: ['post-battle', 'end'] },
]
