import { beforeEach, describe, expect, it } from 'vitest'
import { multi, simple } from '../engine/fixtures'
import { resolveRoll } from '../engine/lookup'
import type { StepDef } from '../engine/types'
import { progressKey, resetAppStore, useAppStore } from './campaign'
import type { CampaignSettings } from './types'

const settings: CampaignSettings = {
  crewSize: 4,
  difficulty: 'normal',
  storyTrack: false,
  battleEvents: true,
}

const step = (over: Partial<StepDef> = {}): StepDef => ({
  id: 'world.tasks.explore',
  phase: 'world',
  section: '2.2',
  title: 'Explorar',
  body: '',
  page: 78,
  tables: ['simple'],
  ...over,
})

const st = () => useAppStore.getState()
const progress = (id: string, turn = 1) => st().progress[progressKey(id, turn)]!

describe('store de campaña', () => {
  beforeEach(() => resetAppStore())

  it('crear campaña: turno 1, progreso de creación y turno, entrada en el diario', () => {
    const id = st().createCampaign({ name: '  Nova  ', settings })
    expect(st().campaigns[id]).toMatchObject({ name: 'Nova', turn: 1, schemaVersion: 1, settings })
    expect(st().progress[progressKey(id, 0)]).toBeDefined()
    expect(progress(id)).toBeDefined()
    expect(st().log).toHaveLength(1)
    expect(st().log[0]).toMatchObject({ kind: 'state-change', text: 'Campaña creada: Nova', turn: 0 })
  })

  it('renombrar escribe en el diario; borrar elimina todo', () => {
    const id = st().createCampaign({ name: 'A', settings })
    st().renameCampaign(id, 'B')
    st().renameCampaign(id, 'B') // sin cambios: no escribe
    expect(st().campaigns[id]!.name).toBe('B')
    expect(st().log.map((e) => e.text)).toEqual(['Campaña creada: A', 'Campaña renombrada: A → B'])
    const other = st().createCampaign({ name: 'C', settings })
    st().deleteCampaign(id)
    expect(st().campaigns[id]).toBeUndefined()
    expect(Object.keys(st().progress).every((k) => k.startsWith(other))).toBe(true)
    expect(st().log.every((e) => e.campaignId === other)).toBe(true)
  })

  it('marcar y desmarcar un paso', () => {
    const id = st().createCampaign({ name: 'A', settings })
    const s = step({ repeat: 'per-crew' })
    st().setStepSlot({ campaignId: id, turn: 1, step: s, slot: 2, value: true })
    expect(progress(id).checked[s.id]![2]).toBe(true)
    const done = st().log.at(-1)!
    expect(done).toMatchObject({ kind: 'step-done', text: 'Paso completado: Explorar (tripulante 3)' })
    st().setStepSlot({ campaignId: id, turn: 1, step: s, slot: 2, value: true }) // ya marcado
    expect(st().log).toHaveLength(2)
    st().setStepSlot({ campaignId: id, turn: 1, step: s, slot: 2, value: false })
    expect(progress(id).checked[s.id]![2]).toBe(false)
    expect(st().log.find((e) => e.id === done.id)!.undone).toBe(true)
  })

  it('flags: escribe la pregunta y la respuesta', () => {
    const id = st().createCampaign({ name: 'A', settings })
    st().setFlag({ campaignId: id, turn: 1, flag: 'traveling', label: '¿Viajas?', value: true })
    st().setFlag({ campaignId: id, turn: 1, flag: 'traveling', label: '¿Viajas?', value: true })
    expect(progress(id).flags.traveling).toBe(true)
    expect(st().log.at(-1)!.text).toBe('¿Viajas? → Sí')
    expect(st().log).toHaveLength(2)
  })

  it('confirmar una tirada marca el paso y deshacer revierte ambas cosas (F1.16)', () => {
    const id = st().createCampaign({ name: 'A', settings })
    const s = step()
    const res = resolveRoll(simple, { natural: 4, modifiers: [{ value: 1, label: 'Savvy' }] })
    const entryId = st().confirmRoll({
      campaignId: id,
      turn: 1,
      step: s,
      markStep: true,
      table: simple,
      resolution: res,
      source: 'manual',
      note: ' ojo ',
    })
    const e = st().log.find((x) => x.id === entryId)!
    expect(e).toMatchObject({
      kind: 'roll',
      phase: 'world',
      stepId: s.id,
      note: 'ojo',
      roll: { tableId: 'simple', natural: 4, total: 5, rowIndex: 1, source: 'manual' },
      checkedSlot: { stepId: s.id, slot: 0 },
    })
    expect(e.text).toContain('Simple Table')
    expect(progress(id).checked[s.id]).toEqual([true])

    // Encadenada: cuelga de la anterior y no marca nada.
    const child = st().confirmRoll({
      campaignId: id,
      turn: 1,
      table: multi,
      resolution: resolveRoll(multi, { natural: 1, column: 'a' }),
      source: 'auto',
      parentId: entryId,
    })
    expect(st().log.find((x) => x.id === child)).toMatchObject({ parentId: entryId, roll: { column: 'a' } })

    st().undoEntry(entryId)
    expect(progress(id).checked[s.id]).toEqual([false])
    expect(st().log.find((x) => x.id === entryId)!.undone).toBe(true)
    expect(st().log.find((x) => x.id === child)!.undone).toBe(true)
    st().undoEntry(entryId) // idempotente
    st().undoEntry('nope')
  })

  it('confirmar con el paso ya completo no marca nada más', () => {
    const id = st().createCampaign({ name: 'A', settings })
    const s = step()
    st().setStepSlot({ campaignId: id, turn: 1, step: s, slot: 0, value: true })
    const entryId = st().confirmRoll({
      campaignId: id,
      turn: 1,
      step: s,
      markStep: true,
      table: simple,
      resolution: resolveRoll(simple, { natural: 1 }),
      source: 'manual',
    })
    expect(st().log.find((x) => x.id === entryId)!.checkedSlot).toBeUndefined()
  })

  it('desmarcar a mano una casilla marcada por una tirada la desvincula sin anular la tirada', () => {
    const id = st().createCampaign({ name: 'A', settings })
    const s = step()
    const entryId = st().confirmRoll({
      campaignId: id,
      turn: 1,
      step: s,
      markStep: true,
      table: simple,
      resolution: resolveRoll(simple, { natural: 1 }),
      source: 'manual',
    })
    st().setStepSlot({ campaignId: id, turn: 1, step: s, slot: 0, value: false })
    const e = st().log.find((x) => x.id === entryId)!
    expect(e.undone).toBeFalsy()
    expect(e.checkedSlot).toBeUndefined()
  })

  it('notas', () => {
    const id = st().createCampaign({ name: 'A', settings })
    const n = st().addNote({ campaignId: id, turn: 1, phase: 'world', text: ' Hola ' })
    expect(st().log.find((e) => e.id === n)).toMatchObject({ kind: 'note', text: 'Hola' })
    st().setEntryNote(n, 'extra')
    expect(st().log.find((e) => e.id === n)!.note).toBe('extra')
    st().setEntryNote(n, '  ')
    expect(st().log.find((e) => e.id === n)!.note).toBeUndefined()
  })
})
