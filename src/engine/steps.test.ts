import { describe, expect, it } from 'vitest'
import {
  conditionFlags,
  DERIVED_FLAGS,
  derivedFlags,
  evalCondition,
  flagsForSteps,
  groupBySection,
  isStepDone,
  MAX_ROUNDS,
  nextFreeSlot,
  phaseProgress,
  slotCount,
  stepsForPhases,
  suggestColumn,
} from './steps'
import type { StepDef } from './types'

const step = (over: Partial<StepDef> & { id: string }): StepDef => ({
  phase: 'world',
  section: 'S',
  title: over.id,
  body: '',
  page: 1,
  ...over,
})

const ctx = { crewSize: 5 }

describe('evalCondition', () => {
  it('sin condición, siempre aplica', () => {
    expect(evalCondition(undefined, {})).toBe(true)
  })
  it('flag, all, any y not', () => {
    const flags = { a: true, b: false }
    expect(evalCondition({ flag: 'a' }, flags)).toBe(true)
    expect(evalCondition({ flag: 'b' }, flags)).toBe(false)
    expect(evalCondition({ flag: 'zzz' }, flags)).toBe(false)
    expect(evalCondition({ all: [{ flag: 'a' }, { flag: 'b' }] }, flags)).toBe(false)
    expect(evalCondition({ any: [{ flag: 'a' }, { flag: 'b' }] }, flags)).toBe(true)
    expect(evalCondition({ not: { flag: 'b' } }, flags)).toBe(true)
    expect(evalCondition({ not: { any: [{ flag: 'a' }, { flag: 'b' }] } }, flags)).toBe(false)
  })
})

describe('flags', () => {
  it('conditionFlags recorre todo el árbol sin repetir', () => {
    expect(
      conditionFlags({ all: [{ flag: 'a' }, { not: { any: [{ flag: 'b' }, { flag: 'a' }] } }] }),
    ).toEqual(['a', 'b'])
    expect(conditionFlags(undefined)).toEqual([])
  })
  it('flagsForSteps junta los de todos los pasos', () => {
    const steps = [
      step({ id: '1', when: { flag: 'x' } }),
      step({ id: '2' }),
      step({ id: '3', when: { flag: 'y' } }),
    ]
    expect(flagsForSteps(steps)).toEqual(['x', 'y'])
  })
  it('derivedFlags: cada 3 turnos y ajustes', () => {
    const base = { storyTrack: true, battleEvents: false, hasVictoryCondition: true }
    expect(derivedFlags({ ...base, turn: 3 })).toEqual({
      'every-third-turn': true,
      'story-track': true,
      'battle-events': false,
      'victory-condition': true,
    })
    expect(derivedFlags({ ...base, turn: 4 })['every-third-turn']).toBe(false)
    expect(derivedFlags({ ...base, turn: 0 })['every-third-turn']).toBe(false)
    expect(DERIVED_FLAGS).toContain('every-third-turn')
  })
})

describe('casillas y progreso', () => {
  const single = step({ id: 's' })
  const perCrew = step({ id: 'c', repeat: 'per-crew' })
  const perRound = step({ id: 'r', repeat: 'per-round' })
  const perCasualty = step({ id: 'k', repeat: 'per-casualty' })

  it('slotCount según repetición', () => {
    expect(slotCount(single, ctx)).toBe(1)
    expect(slotCount(perCrew, ctx)).toBe(5)
    expect(slotCount(perCasualty, ctx)).toBe(5)
    expect(slotCount(perRound, ctx)).toBe(MAX_ROUNDS)
  })

  it('isStepDone: por tripulante exige todas; por ronda o baja, al menos una', () => {
    expect(isStepDone(single, {}, ctx)).toBe(false)
    expect(isStepDone(single, { s: [true] }, ctx)).toBe(true)
    expect(isStepDone(perCrew, { c: [true, true, true, true] }, ctx)).toBe(false)
    expect(isStepDone(perCrew, { c: [true, true, true, true, true] }, ctx)).toBe(true)
    expect(isStepDone(perRound, { r: [false, true] }, ctx)).toBe(true)
    expect(isStepDone(perCasualty, {}, ctx)).toBe(false)
  })

  it('nextFreeSlot', () => {
    expect(nextFreeSlot(perCrew, { c: [true, false, true] }, ctx)).toBe(1)
    expect(nextFreeSlot(single, { s: [true] }, ctx)).toBeUndefined()
    expect(nextFreeSlot(single, {}, ctx)).toBe(0)
  })

  it('phaseProgress ignora opcionales y no aplicables', () => {
    const steps = [
      single,
      perCrew,
      step({ id: 'o', optional: true }),
      step({ id: 'w', when: { flag: 'traveling' } }),
    ]
    expect(phaseProgress(steps, {}, { s: [true] }, ctx)).toEqual({ done: 1, total: 2 })
    expect(phaseProgress(steps, { traveling: true }, { s: [true], w: [true] }, ctx)).toEqual({
      done: 2,
      total: 3,
    })
  })
})

describe('agrupado', () => {
  it('groupBySection conserva el orden', () => {
    const steps = [
      step({ id: '1', section: 'A' }),
      step({ id: '2', section: 'A' }),
      step({ id: '3', section: 'B' }),
    ]
    expect(groupBySection(steps).map((s) => [s.title, s.steps.map((x) => x.id)])).toEqual([
      ['A', ['1', '2']],
      ['B', ['3']],
    ])
  })
  it('stepsForPhases filtra por fase', () => {
    const steps = [
      step({ id: '1', phase: 'battle' }),
      step({ id: '2', phase: 'battle-setup' }),
      step({ id: '3' }),
    ]
    expect(stepsForPhases(steps, ['battle-setup', 'battle']).map((s) => s.id)).toEqual(['1', '2'])
  })
})

describe('suggestColumn', () => {
  const dep = ['opportunity-patron', 'rival', 'quest']
  const enemy = ['opportunity', 'patron', 'quest', 'unknown-rival']
  it('por defecto, oportunidad', () => {
    expect(suggestColumn(dep, { flags: {} })).toBe('opportunity-patron')
    expect(suggestColumn(enemy, { flags: {} })).toBe('opportunity')
  })
  it('según el tipo de batalla', () => {
    expect(suggestColumn(dep, { flags: { 'rival-battle': true } })).toBe('rival')
    expect(suggestColumn(dep, { flags: { 'quest-battle': true } })).toBe('quest')
    expect(suggestColumn(enemy, { flags: { 'patron-job': true } })).toBe('patron')
    expect(suggestColumn(dep, { flags: { 'patron-job': true } })).toBe('opportunity-patron')
  })
  it('Rivales iniciales usan Unknown Rivals', () => {
    expect(suggestColumn(enemy, { stepId: 'creation.start.rivals', flags: {} })).toBe('unknown-rival')
  })
  it('si nada encaja, la primera columna', () => {
    expect(suggestColumn(['x', 'y'], { flags: {} })).toBe('x')
  })
})
