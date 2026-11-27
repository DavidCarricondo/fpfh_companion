/**
 * Tests sobre el contenido real (content/). Propiedad (spec §12.2): para cada tabla,
 * cualquier valor válido del dado devuelve exactamente una fila.
 */
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { diceRange } from '../engine/dice'
import { lookupRow, resolveRoll, rowRange } from '../engine/lookup'
import { getTable, tables } from './index'

const rollable = tables.filter((t) => t.dice)
const cases = rollable.flatMap((t) => (t.columns ?? [undefined]).map((c) => ({ table: t, column: c?.id })))

describe('contenido', () => {
  it('hay tablas cargadas', () => {
    expect(tables.length).toBeGreaterThan(0)
  })

  it.each(cases.map((c) => [`${c.table.id}${c.column ? `:${c.column}` : ''}`, c] as const))(
    '%s: cada valor cae en exactamente una fila',
    (_name, { table, column }) => {
      const { min, max } = diceRange(table.dice!)
      fc.assert(
        fc.property(fc.integer({ min, max }), (v) => {
          const hits = table.rows.filter((row) => {
            const r = rowRange(table, row, column)
            return r !== undefined && v >= r[0] && v <= r[1]
          })
          expect(hits).toHaveLength(1)
        }),
        { numRuns: 200 },
      )
      // Extremos siempre (D100=1 y D100=100, criterio de aceptación v1)
      expect(() => lookupRow(table, min, column)).not.toThrow()
      expect(() => lookupRow(table, max, column)).not.toThrow()
    },
  )

  it('Crew Type → Primary Alien se encadena', () => {
    const crewType = getTable('crew-type')!
    const res = resolveRoll(crewType, { natural: 70 })
    expect(res.match.row.result).toBe('Primary Alien')
    expect(res.next).toEqual([{ tableId: 'primary-alien', label: 'Roll Primary Alien' }])
    const alien = getTable(res.next[0]!.tableId)!
    expect(resolveRoll(alien, { natural: 100 }).match.row.result).toBe('Swift')
  })

  it('Loot → Weapon Category → Slug Weapons se encadena (criterio v1)', () => {
    const loot = resolveRoll(getTable('loot')!, { natural: 10 })
    expect(loot.match.row.result).toBe('Weapon')
    const category = resolveRoll(getTable(loot.next[0]!.tableId)!, { natural: 1 })
    expect(category.match.row.result).toBe('Slug Weapons')
    const slug = resolveRoll(getTable(category.next[0]!.tableId)!, { natural: 100 })
    expect(slug.match.row.result).toBe('Rattle Gun')
  })

  it('Damaged weapons: dos tiradas en Weapon Category', () => {
    const res = resolveRoll(getTable('loot')!, { natural: 30 })
    expect(res.next.map((n) => n.tableId)).toEqual(['loot-weapon-category', 'loot-weapon-category'])
  })

  it('Deployment Conditions por columna', () => {
    const t = getTable('deployment-conditions')!
    expect(resolveRoll(t, { natural: 30, column: 'opportunity-patron' }).match.row.result).toBe(
      'No Condition',
    )
    expect(resolveRoll(t, { natural: 30, column: 'rival' }).match.row.result).toBe('Toxic environment')
    expect(resolveRoll(t, { natural: 30, column: 'quest' }).match.row.result).toBe('Brief engagement')
  })

  it('Injury: D100=48 → Serious injury', () => {
    const res = resolveRoll(getTable('injury')!, { natural: 48 })
    expect(res.match.row.result).toBe('Serious injury')
    expect(res.match.row.fields?.sickBay).toBe('1D3+1')
  })
})
