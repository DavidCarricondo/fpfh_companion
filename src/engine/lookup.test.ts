import { describe, expect, it } from 'vitest'
import { keepHighest, multi, reference, simple } from './fixtures'
import {
  LookupError,
  applyModifiers,
  expandNext,
  formatBreakdown,
  formatRollLine,
  isMultiColumn,
  lookupRow,
  resolveRoll,
  rowsForColumn,
  tableRange,
} from './lookup'

describe('lookupRow', () => {
  it('extremos de cada rango', () => {
    expect(lookupRow(simple, 1).row.result).toBe('Low')
    expect(lookupRow(simple, 2).row.result).toBe('Low')
    expect(lookupRow(simple, 3).row.result).toBe('Mid')
    expect(lookupRow(simple, 5).rowIndex).toBe(1)
    expect(lookupRow(simple, 6).range).toEqual([6, 6])
  })
  it('fuera de rango', () => {
    expect(() => lookupRow(simple, 0)).toThrow(LookupError)
    expect(() => lookupRow(simple, 7)).toThrow(LookupError)
  })
  it('multicolumna', () => {
    expect(isMultiColumn(multi)).toBe(true)
    expect(isMultiColumn(simple)).toBe(false)
    expect(lookupRow(multi, 2, 'a').row.result).toBe('First')
    expect(lookupRow(multi, 2, 'b').row.result).toBe('First')
    expect(lookupRow(multi, 3, 'b').row.result).toBe('Only in B')
    expect(lookupRow(multi, 7, 'a').row.result).toBe('Only in A')
    expect(lookupRow(multi, 10, 'b').rowIndex).toBe(2)
  })
  it('errores de columna', () => {
    expect(() => lookupRow(multi, 2)).toThrow(/indica cuál/)
    expect(() => lookupRow(multi, 2, 'z')).toThrow(/no tiene la columna/)
    expect(() => lookupRow(simple, 2, 'a')).toThrow(/no tiene columnas/)
  })
})

describe('rowsForColumn', () => {
  it('filtra filas ausentes', () => {
    expect(rowsForColumn(multi, 'a').map((m) => m.row.result)).toEqual(['First', 'Only in A'])
    expect(rowsForColumn(multi, 'b').map((m) => m.range)).toEqual([
      [1, 2],
      [3, 10],
    ])
    expect(rowsForColumn(simple)).toHaveLength(3)
  })
})

describe('modificadores', () => {
  it('suma y limita al rango', () => {
    const r = { min: 1, max: 6 }
    expect(applyModifiers(4, [{ value: 1, label: 'Savvy' }], r)).toMatchObject({
      raw: 5,
      total: 5,
      clamped: false,
    })
    expect(applyModifiers(5, [{ value: 3, label: '' }], r)).toMatchObject({ raw: 8, total: 6, clamped: true })
    expect(applyModifiers(1, [{ value: -2, label: '' }], r)).toMatchObject({
      raw: -1,
      total: 1,
      clamped: true,
    })
  })
  it('desglose legible', () => {
    const r = { min: 2, max: 12 }
    expect(formatBreakdown(applyModifiers(7, [], r))).toBe('7')
    expect(
      formatBreakdown(
        applyModifiers(
          7,
          [
            { value: 2, label: 'Savvy' },
            { value: -1, label: 'Hired Muscle' },
          ],
          r,
        ),
      ),
    ).toBe('7 + 2 (Savvy) − 1 (Hired Muscle) = 8')
    expect(formatBreakdown(applyModifiers(11, [{ value: 3, label: '' }], r))).toBe(
      '11 + 3 = 14 → 12 (límite de la tabla)',
    )
  })
})

describe('expandNext', () => {
  it('expande times', () => {
    expect(expandNext(undefined)).toEqual([])
    expect(expandNext(simple.rows[1]!.next)).toEqual([
      { tableId: 'sub', label: 'Roll sub twice' },
      { tableId: 'sub', label: 'Roll sub twice' },
    ])
  })
})

describe('resolveRoll', () => {
  it('con total natural', () => {
    const res = resolveRoll(simple, { natural: 6 })
    expect(res.match.row.result).toBe('High')
    expect(res.next).toEqual([{ tableId: 'sub' }, { tableId: 'multi', column: 'b' }])
    expect(res.column).toBeUndefined()
  })
  it('con caras individuales y keep highest', () => {
    const res = resolveRoll(keepHighest, { dice: [2, 5] })
    expect(res.modified.natural).toBe(5)
    expect(res.match.row.result).toBe('Many')
    expect(res.dice).toEqual([2, 5])
  })
  it('con modificadores y columna', () => {
    const res = resolveRoll(multi, { natural: 4, column: 'a', modifiers: [{ value: 3, label: 'bonus' }] })
    expect(res.modified.total).toBe(7)
    expect(res.match.row.result).toBe('Only in A')
    expect(res.column).toBe('a')
  })
  it('rechaza valores imposibles', () => {
    expect(() => resolveRoll(simple, { natural: 7 })).toThrow(/no es posible/)
    expect(() => resolveRoll(simple, {})).toThrow(/Falta/)
    expect(() => resolveRoll(reference, { natural: 1 })).toThrow(/referencia/)
    expect(() => tableRange(reference)).toThrow(LookupError)
  })
  it('línea del diario', () => {
    expect(formatRollLine(simple, resolveRoll(simple, { natural: 1 }))).toBe('Simple Table (D6=1): Low')
    expect(formatRollLine(multi, resolveRoll(multi, { natural: 3, column: 'b' }))).toBe(
      'Multi Table · Column B (D10=3): Only in B',
    )
    expect(
      formatRollLine(simple, resolveRoll(simple, { natural: 2, modifiers: [{ value: 1, label: 'Savvy' }] })),
    ).toBe('Simple Table (D6=3, 2 + 1 (Savvy) = 3): Mid')
  })
})
