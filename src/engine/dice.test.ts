import { describe, expect, it } from 'vitest'
import {
  DiceError,
  diceRange,
  formatDice,
  isDiceFormula,
  isValidFace,
  isValidTotal,
  normalizeDice,
  parseD100Entry,
  parseDiceNotation,
  requiresIndividualDice,
  rollDice,
  rollDie,
  rollFormula,
  totalFromFaces,
} from './dice'

/** Rng determinista que devuelve la secuencia dada en bucle. */
const seq = (...values: number[]) => {
  let i = 0
  return () => values[i++ % values.length]!
}

describe('parseDiceNotation', () => {
  it.each([
    ['D6', { dice: 1, sides: 6, plus: 0 }],
    ['2D6', { dice: 2, sides: 6, plus: 0 }],
    ['1D3+1', { dice: 1, sides: 3, plus: 1 }],
    ['1D6-3', { dice: 1, sides: 6, plus: -3 }],
    ['D100', { dice: 1, sides: 100, plus: 0 }],
    ['2d6 keep highest', { dice: 2, sides: 6, plus: 0, keep: 'highest' }],
    [' 3D6 + 2 ', { dice: 3, sides: 6, plus: 2 }],
  ])('%s', (s, expected) => {
    expect(parseDiceNotation(s)).toEqual(expected)
  })

  it.each(['', 'D', '6', 'D1', '0D6', '1D6 keep highest', 'D6+x', '2D6 keep middle'])('rechaza "%s"', (s) => {
    expect(() => parseDiceNotation(s)).toThrow(DiceError)
  })
})

describe('normalizeDice / diceRange', () => {
  it('acepta objetos', () => {
    expect(normalizeDice({ dice: 2, sides: 6, keep: 'lowest' })).toEqual({
      dice: 2,
      sides: 6,
      plus: 0,
      keep: 'lowest',
    })
    expect(() => normalizeDice({ dice: 1, sides: 0 })).toThrow(DiceError)
    expect(() => normalizeDice({ dice: 1, sides: 6, plus: 0.5 })).toThrow(DiceError)
  })

  it.each([
    ['D3', 1, 3],
    ['D6', 1, 6],
    ['D10', 1, 10],
    ['D100', 1, 100],
    ['2D6', 2, 12],
    ['3D6', 3, 18],
  ] as const)('%s → %i..%i', (spec, min, max) => {
    expect(diceRange(spec)).toEqual({ min, max })
  })

  it('keep highest/lowest y plus', () => {
    expect(diceRange({ dice: 2, sides: 6, keep: 'highest' })).toEqual({ min: 1, max: 6 })
    expect(diceRange({ dice: 2, sides: 6, plus: 3 })).toEqual({ min: 5, max: 15 })
  })
})

describe('formatDice', () => {
  it('formatea', () => {
    expect(formatDice('D100')).toBe('D100')
    expect(formatDice('2D6')).toBe('2D6')
    expect(formatDice({ dice: 1, sides: 3, plus: 1 })).toBe('D3+1')
    expect(formatDice({ dice: 1, sides: 6, plus: -3 })).toBe('D6-3')
    expect(formatDice({ dice: 2, sides: 6, keep: 'highest' })).toBe('2D6 (el más alto)')
    expect(formatDice({ dice: 2, sides: 6, keep: 'lowest' })).toBe('2D6 (el más bajo)')
  })
})

describe('totalFromFaces', () => {
  it('suma, keep y plus', () => {
    expect(totalFromFaces('2D6', [3, 5])).toBe(8)
    expect(totalFromFaces({ dice: 2, sides: 6, keep: 'highest' }, [3, 5])).toBe(5)
    expect(totalFromFaces({ dice: 2, sides: 6, keep: 'lowest' }, [3, 5])).toBe(3)
    expect(totalFromFaces({ dice: 1, sides: 3, plus: 1 }, [3])).toBe(4)
  })
  it('rechaza caras imposibles o recuento incorrecto', () => {
    expect(() => totalFromFaces('2D6', [3])).toThrow(DiceError)
    expect(() => totalFromFaces('2D6', [3, 7])).toThrow(DiceError)
    expect(() => totalFromFaces('D6', [0])).toThrow(DiceError)
    expect(() => totalFromFaces('D6', [2.5])).toThrow(DiceError)
  })
  it('requiresIndividualDice', () => {
    expect(requiresIndividualDice('2D6')).toBe(false)
    expect(requiresIndividualDice({ dice: 2, sides: 6, keep: 'highest' })).toBe(true)
  })
  it('isValidFace / isValidTotal', () => {
    expect(isValidFace(6, 6)).toBe(true)
    expect(isValidFace(6, 7)).toBe(false)
    expect(isValidTotal('2D6', 1)).toBe(false)
    expect(isValidTotal('2D6', 2)).toBe(true)
    expect(isValidTotal('2D6', 12)).toBe(true)
    expect(isValidTotal('2D6', 13)).toBe(false)
    expect(isValidTotal('D100', 100)).toBe(true)
    expect(isValidTotal('D100', 7.5)).toBe(false)
  })
})

describe('parseD100Entry', () => {
  it.each([
    ['1', 1],
    ['01', 1],
    ['48', 48],
    ['100', 100],
    ['00', 100],
    ['0', 100],
    [' 7 ', 7],
  ])('"%s" → %i', (s, n) => expect(parseD100Entry(s)).toBe(n))
  it.each(['', '101', '-1', 'a', '1000', '4.5'])('"%s" → null', (s) => expect(parseD100Entry(s)).toBeNull())
})

describe('tiradas', () => {
  it('rollDie cubre los extremos', () => {
    expect(rollDie(6, () => 0)).toBe(1)
    expect(rollDie(6, () => 0.9999999)).toBe(6)
    expect(rollDie(100, () => 0.999)).toBe(100)
  })
  it('rollDie rechaza generadores rotos', () => {
    expect(() => rollDie(6, () => 1)).toThrow(DiceError)
    expect(() => rollDie(6, () => -0.1)).toThrow(DiceError)
    expect(() => rollDie(6, () => Number.NaN)).toThrow(DiceError)
  })
  it('rollDice devuelve caras y total', () => {
    expect(rollDice('2D6', seq(0, 0.5))).toEqual({ dice: [1, 4], total: 5 })
    expect(rollDice({ dice: 2, sides: 6, keep: 'highest' }, seq(0, 0.5))).toEqual({ dice: [1, 4], total: 4 })
  })
  it('rollFormula', () => {
    expect(rollFormula(3, seq(0))).toEqual({ dice: [], total: 3 })
    expect(rollFormula('2', seq(0))).toEqual({ dice: [], total: 2 })
    expect(rollFormula('1D3+1', seq(0.99))).toEqual({ dice: [3], total: 4 })
  })
  it('isDiceFormula', () => {
    expect(isDiceFormula('1D3+1')).toBe(true)
    expect(isDiceFormula('Military Rifle')).toBe(false)
    expect(isDiceFormula(3)).toBe(false)
  })
})
