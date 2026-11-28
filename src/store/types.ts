/**
 * Tipos del estado de v1 (spec §5.3, §8.1 F1.2 y §11.1). En M4 se persisten con Dexie.
 */
import type { Modifier } from '../engine/lookup'
import type { StepPhase } from '../engine/types'

export type Difficulty = 'easy' | 'normal' | 'challenging' | 'hardcore' | 'insanity'
export type CrewSize = 4 | 5 | 6

export interface CampaignSettings {
  crewSize: CrewSize
  difficulty: Difficulty
  storyTrack: boolean
  victory?: string
  houseRules?: string
  battleEvents: boolean
}

export interface Campaign {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  schemaVersion: 1
  /** Turno de campaña actual. La creación (Parte 1) se guarda como turno 0. */
  turn: number
  settings: CampaignSettings
  notes?: string
}

/** Turno 0 = creación de la campaña (Parte 1). */
export const CREATION_TURN = 0

export interface TurnProgress {
  campaignId: string
  turn: number
  /** Casillas marcadas por paso (una por tripulante, ronda o baja en los pasos repetibles). */
  checked: Record<string, boolean[]>
  flags: Record<string, boolean>
}

export interface LogRoll {
  tableId: string
  column?: string
  dice: number[]
  /** Total natural del dado, antes de modificadores. */
  natural: number
  /** Total con modificadores, limitado a la tabla (el que decide la fila). */
  total: number
  modifiers?: Modifier[]
  rowIndex: number
  source: 'manual' | 'auto'
}

export interface LogEntry {
  id: string
  campaignId: string
  turn: number
  /** Sin fase: tirada anotada desde la biblioteca de tablas, fuera del flujo. */
  phase?: StepPhase
  stepId?: string
  at: string
  kind: 'roll' | 'step-done' | 'note' | 'state-change' | 'battle'
  roll?: LogRoll
  text: string
  note?: string
  undone?: boolean
  /** Tirada encadenada: id de la tirada que la originó (F1.14). */
  parentId?: string
  /** Casilla que marcó esta entrada, para revertirla al deshacer (F1.16). */
  checkedSlot?: { stepId: string; slot: number }
}
