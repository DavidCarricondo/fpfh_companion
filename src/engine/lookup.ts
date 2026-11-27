/**
 * Búsqueda en tablas: valor → fila, columnas, modificadores y encadenado.
 */
import { diceRange, formatDice, totalFromFaces, type DiceSpec } from './dice'
import type { NextRoll, Range, TableDef, TableRow } from './types'

export class LookupError extends Error {
  override name = 'LookupError'
}

export interface Modifier {
  value: number
  /** Etiqueta libre: "Savvy de Nada", "superado en número" */
  label: string
}

export interface ModifiedTotal {
  natural: number
  modifiers: Modifier[]
  /** natural + modificadores, sin limitar */
  raw: number
  /** raw limitado al rango de la tabla */
  total: number
  clamped: boolean
}

export function tableDice(table: TableDef): DiceSpec {
  if (!table.dice) throw new LookupError(`La tabla "${table.id}" es de referencia y no se tira`)
  return table.dice
}

export function tableRange(table: TableDef): { min: number; max: number } {
  return diceRange(tableDice(table))
}

/** Aplica modificadores al total natural y lo limita al rango de la tabla (F1.11). */
export function applyModifiers(
  natural: number,
  modifiers: readonly Modifier[],
  range: { min: number; max: number },
): ModifiedTotal {
  const raw = modifiers.reduce((acc, m) => acc + m.value, natural)
  const total = Math.min(range.max, Math.max(range.min, raw))
  return { natural, modifiers: [...modifiers], raw, total, clamped: total !== raw }
}

/** "7 + 2 (Savvy) − 1 (Hired Muscle) = 8" */
export function formatBreakdown(m: ModifiedTotal): string {
  if (m.modifiers.length === 0) return String(m.total)
  const parts = m.modifiers.map(
    (mod) => `${mod.value < 0 ? '−' : '+'} ${Math.abs(mod.value)}${mod.label ? ` (${mod.label})` : ''}`,
  )
  const clamped = m.clamped ? ` → ${m.total} (límite de la tabla)` : ''
  return `${m.natural} ${parts.join(' ')} = ${m.raw}${clamped}`
}

export function isMultiColumn(table: TableDef): boolean {
  return (table.columns?.length ?? 0) > 0
}

/** Rango de la fila para una columna; undefined si la fila no existe en esa columna. */
export function rowRange(table: TableDef, row: TableRow, columnId?: string): Range | undefined {
  const r = row.range
  if (r === undefined) return undefined
  if (Array.isArray(r)) return r
  if (!columnId) throw new LookupError(`La tabla "${table.id}" tiene varias columnas: indica cuál`)
  return r[columnId]
}

function assertColumn(table: TableDef, columnId: string | undefined): void {
  if (!isMultiColumn(table)) {
    if (columnId !== undefined)
      throw new LookupError(`La tabla "${table.id}" no tiene columnas (se pidió "${columnId}")`)
    return
  }
  if (columnId === undefined)
    throw new LookupError(`La tabla "${table.id}" tiene varias columnas: indica cuál`)
  if (!table.columns!.some((c) => c.id === columnId)) {
    throw new LookupError(`La tabla "${table.id}" no tiene la columna "${columnId}"`)
  }
}

export interface RowMatch {
  row: TableRow
  rowIndex: number
  range: Range
}

/** Encuentra la fila cuyo rango (inclusivo) contiene `value`. */
export function lookupRow(table: TableDef, value: number, columnId?: string): RowMatch {
  assertColumn(table, columnId)
  for (let i = 0; i < table.rows.length; i++) {
    const row = table.rows[i]!
    const range = rowRange(table, row, columnId)
    if (range && value >= range[0] && value <= range[1]) return { row, rowIndex: i, range }
  }
  const col = columnId ? ` (columna ${columnId})` : ''
  throw new LookupError(`Ninguna fila de "${table.id}"${col} cubre el valor ${value}`)
}

/** Filas presentes en una columna, en orden, con su rango (para "Ver tabla entera"). */
export function rowsForColumn(table: TableDef, columnId?: string): RowMatch[] {
  assertColumn(table, columnId)
  const out: RowMatch[] = []
  table.rows.forEach((row, rowIndex) => {
    const range = rowRange(table, row, columnId)
    if (range) out.push({ row, rowIndex, range })
  })
  return out
}

/** Expande `times` en tiradas individuales: [{Loot, times:2}] → [Loot, Loot]. */
export function expandNext(next: readonly NextRoll[] | undefined): NextRoll[] {
  const out: NextRoll[] = []
  for (const n of next ?? []) {
    const times = n.times ?? 1
    for (let i = 0; i < times; i++) {
      const { times: _t, ...single } = n
      out.push(single)
    }
  }
  return out
}

export interface RollInput {
  /** Caras individuales (si se conocen). */
  dice?: number[]
  /** Total natural introducido directamente (si no hay caras). */
  natural?: number
  modifiers?: Modifier[]
  column?: string
}

export interface RollResolution {
  tableId: string
  column?: string
  dice: number[]
  modified: ModifiedTotal
  match: RowMatch
  next: NextRoll[]
}

/** Resuelve una tirada completa contra una tabla. */
export function resolveRoll(table: TableDef, input: RollInput): RollResolution {
  const spec = tableDice(table)
  const range = diceRange(spec)
  let natural: number
  const dice = input.dice ?? []
  if (dice.length > 0) {
    natural = totalFromFaces(spec, dice)
  } else if (input.natural !== undefined) {
    natural = input.natural
    if (!Number.isInteger(natural) || natural < range.min || natural > range.max) {
      throw new LookupError(`${natural} no es posible con ${formatDice(spec)} (${range.min}–${range.max})`)
    }
  } else {
    throw new LookupError('Falta el resultado del dado')
  }
  const modified = applyModifiers(natural, input.modifiers ?? [], range)
  const match = lookupRow(table, modified.total, input.column)
  return {
    tableId: table.id,
    ...(input.column !== undefined ? { column: input.column } : {}),
    dice,
    modified,
    match,
    next: expandNext(match.row.next),
  }
}

/** Línea legible para el diario: "Injury Table (D100=48): Serious injury" */
export function formatRollLine(table: TableDef, res: RollResolution): string {
  const colLabel = res.column ? table.columns?.find((c) => c.id === res.column)?.label : undefined
  const dice = `${formatDice(tableDice(table))}=${res.modified.total}`
  const mods = res.modified.modifiers.length ? `, ${formatBreakdown(res.modified)}` : ''
  return `${table.name}${colLabel ? ` · ${colLabel}` : ''} (${dice}${mods}): ${res.match.row.result}`
}
