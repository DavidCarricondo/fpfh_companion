/**
 * Store de campañas, progreso del turno y diario (spec §8.1). En memoria en M3; Dexie llega en M4.
 * Regla: todo cambio de estado pasa por una acción de aquí y escribe también en el diario.
 */
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { formatRollLine, type RollResolution } from '../engine/lookup'
import { nextFreeSlot, slotCount } from '../engine/steps'
import type { StepDef, StepPhase, TableDef } from '../engine/types'
import {
  CREATION_TURN,
  type Campaign,
  type CampaignSettings,
  type LogEntry,
  type TurnProgress,
} from './types'

export interface AppState {
  campaigns: Record<string, Campaign>
  /** Clave: `${campaignId}:${turn}` */
  progress: Record<string, TurnProgress>
  log: LogEntry[]
}

export interface ConfirmRollInput {
  campaignId: string
  turn: number
  phase?: StepPhase
  /** Paso desde el que se tiró; si se pasa `markStep`, se marca su siguiente casilla libre. */
  step?: StepDef
  markStep?: boolean
  table: TableDef
  resolution: RollResolution
  source: 'manual' | 'auto'
  note?: string
  parentId?: string
}

export interface AppActions {
  createCampaign(input: { name: string; settings: CampaignSettings }): string
  renameCampaign(id: string, name: string): void
  deleteCampaign(id: string): void
  setStepSlot(input: { campaignId: string; turn: number; step: StepDef; slot: number; value: boolean }): void
  setFlag(input: { campaignId: string; turn: number; flag: string; label: string; value: boolean }): void
  /** Devuelve el id de la entrada creada. */
  confirmRoll(input: ConfirmRollInput): string
  addNote(input: { campaignId: string; turn: number; phase?: StepPhase; text: string }): string
  setEntryNote(entryId: string, note: string): void
  /** Deshace una entrada (y sus tiradas encadenadas), revirtiendo la casilla que marcó. */
  undoEntry(entryId: string): void
}

export type AppStore = AppState & AppActions

export const progressKey = (campaignId: string, turn: number) => `${campaignId}:${turn}`

export const emptyProgress = (campaignId: string, turn: number): TurnProgress => ({
  campaignId,
  turn,
  checked: {},
  flags: {},
})

export const initialState: AppState = { campaigns: {}, progress: {}, log: [] }

/** Inyectables para tests. */
export const env = {
  newId: (): string => crypto.randomUUID(),
  now: (): string => new Date().toISOString(),
}

function slotLabel(step: StepDef, slot: number): string {
  if (!step.repeat) return ''
  const what = step.repeat === 'per-round' ? 'ronda' : step.repeat === 'per-crew' ? 'tripulante' : 'baja'
  return ` (${what} ${slot + 1})`
}

export const useAppStore = create<AppStore>()(
  immer((set, get) => {
    const ensureProgress = (s: AppState, campaignId: string, turn: number): TurnProgress => {
      const key = progressKey(campaignId, turn)
      return (s.progress[key] ??= emptyProgress(campaignId, turn))
    }
    const touch = (s: AppState, campaignId: string) => {
      const c = s.campaigns[campaignId]
      if (c) c.updatedAt = env.now()
    }
    const entry = (e: Omit<LogEntry, 'id' | 'at'>): LogEntry => ({ id: env.newId(), at: env.now(), ...e })

    return {
      ...initialState,

      createCampaign({ name, settings }) {
        const id = env.newId()
        const now = env.now()
        set((s) => {
          s.campaigns[id] = {
            id,
            name: name.trim(),
            createdAt: now,
            updatedAt: now,
            schemaVersion: 1,
            turn: 1,
            settings,
          }
          ensureProgress(s, id, CREATION_TURN)
          ensureProgress(s, id, 1)
          s.log.push(
            entry({
              campaignId: id,
              turn: CREATION_TURN,
              phase: 'creation',
              kind: 'state-change',
              text: `Campaña creada: ${name.trim()}`,
            }),
          )
        })
        return id
      },

      renameCampaign(id, name) {
        set((s) => {
          const c = s.campaigns[id]
          if (!c || !name.trim() || c.name === name.trim()) return
          s.log.push(
            entry({
              campaignId: id,
              turn: c.turn,
              kind: 'state-change',
              text: `Campaña renombrada: ${c.name} → ${name.trim()}`,
            }),
          )
          c.name = name.trim()
          touch(s, id)
        })
      },

      deleteCampaign(id) {
        set((s) => {
          delete s.campaigns[id]
          for (const key of Object.keys(s.progress))
            if (s.progress[key]!.campaignId === id) delete s.progress[key]
          s.log = s.log.filter((e) => e.campaignId !== id)
        })
      },

      setStepSlot({ campaignId, turn, step, slot, value }) {
        set((s) => {
          const p = ensureProgress(s, campaignId, turn)
          const slots = (p.checked[step.id] ??= [])
          if (Boolean(slots[slot]) === value) return
          slots[slot] = value
          if (value) {
            s.log.push(
              entry({
                campaignId,
                turn,
                phase: step.phase,
                stepId: step.id,
                kind: 'step-done',
                text: `Paso completado: ${step.title}${slotLabel(step, slot)}`,
                checkedSlot: { stepId: step.id, slot },
              }),
            )
          } else {
            // Desmarcar anula la entrada que marcó esa casilla (paso o tirada), si la hay.
            for (let i = s.log.length - 1; i >= 0; i--) {
              const e = s.log[i]!
              if (
                e.campaignId === campaignId &&
                e.turn === turn &&
                !e.undone &&
                e.checkedSlot?.stepId === step.id &&
                e.checkedSlot.slot === slot
              ) {
                if (e.kind === 'step-done') e.undone = true
                else delete e.checkedSlot
                break
              }
            }
          }
          touch(s, campaignId)
        })
      },

      setFlag({ campaignId, turn, flag, label, value }) {
        set((s) => {
          const p = ensureProgress(s, campaignId, turn)
          if (Boolean(p.flags[flag]) === value) return
          p.flags[flag] = value
          s.log.push(
            entry({
              campaignId,
              turn,
              kind: 'state-change',
              text: `${label} → ${value ? 'Sí' : 'No'}`,
            }),
          )
          touch(s, campaignId)
        })
      },

      confirmRoll(input) {
        const { campaignId, turn, step, table, resolution: res } = input
        const e = entry({
          campaignId,
          turn,
          ...(input.phase ? { phase: input.phase } : step ? { phase: step.phase } : {}),
          ...(step ? { stepId: step.id } : {}),
          kind: 'roll',
          roll: {
            tableId: table.id,
            ...(res.column !== undefined ? { column: res.column } : {}),
            dice: res.dice,
            natural: res.modified.natural,
            total: res.modified.total,
            ...(res.modified.modifiers.length ? { modifiers: res.modified.modifiers } : {}),
            rowIndex: res.match.rowIndex,
            source: input.source,
          },
          text: formatRollLine(table, res),
          ...(input.note?.trim() ? { note: input.note.trim() } : {}),
          ...(input.parentId ? { parentId: input.parentId } : {}),
        })
        set((s) => {
          if (step && input.markStep) {
            const c = s.campaigns[campaignId]
            const p = ensureProgress(s, campaignId, turn)
            const ctx = { crewSize: c?.settings.crewSize ?? 6 }
            const slot = nextFreeSlot(step, p.checked, ctx)
            if (slot !== undefined && slot < slotCount(step, ctx)) {
              ;(p.checked[step.id] ??= [])[slot] = true
              e.checkedSlot = { stepId: step.id, slot }
            }
          }
          s.log.push(e)
          touch(s, campaignId)
        })
        return e.id
      },

      addNote({ campaignId, turn, phase, text }) {
        const e = entry({ campaignId, turn, ...(phase ? { phase } : {}), kind: 'note', text: text.trim() })
        set((s) => {
          s.log.push(e)
          touch(s, campaignId)
        })
        return e.id
      },

      setEntryNote(entryId, note) {
        set((s) => {
          const e = s.log.find((x) => x.id === entryId)
          if (!e) return
          if (note.trim()) e.note = note.trim()
          else delete e.note
          touch(s, e.campaignId)
        })
      },

      undoEntry(entryId) {
        if (!get().log.some((e) => e.id === entryId && !e.undone)) return
        set((s) => {
          const ids = new Set([entryId])
          // Las tiradas encadenadas cuelgan de su padre: deshacerlo las deshace también.
          let grew = true
          while (grew) {
            grew = false
            for (const e of s.log) {
              if (e.parentId && ids.has(e.parentId) && !ids.has(e.id)) {
                ids.add(e.id)
                grew = true
              }
            }
          }
          for (const e of s.log) {
            if (!ids.has(e.id) || e.undone) continue
            e.undone = true
            if (e.checkedSlot) {
              const p = s.progress[progressKey(e.campaignId, e.turn)]
              const slots = p?.checked[e.checkedSlot.stepId]
              if (slots) slots[e.checkedSlot.slot] = false
            }
            touch(s, e.campaignId)
          }
        })
      },
    }
  }),
)

/** Solo para tests. */
export function resetAppStore(): void {
  useAppStore.setState(initialState)
}
