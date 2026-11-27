/**
 * Dados: parseo de notación, rangos, validación de entradas y tiradas.
 * Puro: la aleatoriedad llega siempre como un `Rng` inyectado.
 */

export type DiceShorthand = 'D3' | 'D6' | 'D10' | 'D100' | '2D6' | '3D6'

export interface DiceObject {
  dice: number
  sides: number
  keep?: 'highest' | 'lowest'
  plus?: number
}

export type DiceSpec = DiceShorthand | DiceObject

export interface NormalizedDice {
  dice: number
  sides: number
  keep?: 'highest' | 'lowest'
  plus: number
}

/** Devuelve un número en [0, 1). */
export type Rng = () => number

export class DiceError extends Error {
  override name = 'DiceError'
}

const NOTATION = /^\s*(\d*)\s*[dD]\s*(\d+)\s*(?:([+-])\s*(\d+))?\s*(?:keep\s+(highest|lowest))?\s*$/i

/**
 * Parsea notación del libro: "D6", "2D6", "1D3+1", "D100", "2D6 keep highest", "1D6-3".
 */
export function parseDiceNotation(notation: string): NormalizedDice {
  const m = NOTATION.exec(notation)
  if (!m) throw new DiceError(`Notación de dados no válida: "${notation}"`)
  const dice = m[1] ? Number(m[1]) : 1
  const sides = Number(m[2])
  const sign = m[3] === '-' ? -1 : 1
  const plus = m[4] ? sign * Number(m[4]) : 0
  const keep = m[5]?.toLowerCase() as NormalizedDice['keep']
  return check({ dice, sides, plus, ...(keep ? { keep } : {}) })
}

function check(d: NormalizedDice): NormalizedDice {
  if (!Number.isInteger(d.dice) || d.dice < 1) throw new DiceError(`Número de dados no válido: ${d.dice}`)
  if (!Number.isInteger(d.sides) || d.sides < 2) throw new DiceError(`Número de caras no válido: ${d.sides}`)
  if (!Number.isInteger(d.plus)) throw new DiceError(`Modificador no válido: ${d.plus}`)
  if (d.keep && d.dice < 2) throw new DiceError('"keep" requiere al menos 2 dados')
  return d
}

export function normalizeDice(spec: DiceSpec): NormalizedDice {
  if (typeof spec === 'string') return parseDiceNotation(spec)
  return check({
    dice: spec.dice,
    sides: spec.sides,
    plus: spec.plus ?? 0,
    ...(spec.keep ? { keep: spec.keep } : {}),
  })
}

export function diceRange(spec: DiceSpec): { min: number; max: number } {
  const d = normalizeDice(spec)
  if (d.keep) return { min: 1 + d.plus, max: d.sides + d.plus }
  return { min: d.dice + d.plus, max: d.dice * d.sides + d.plus }
}

export function formatDice(spec: DiceSpec): string {
  const d = normalizeDice(spec)
  const base = `${d.dice === 1 ? '' : d.dice}D${d.sides}`
  const plus = d.plus === 0 ? '' : d.plus > 0 ? `+${d.plus}` : `${d.plus}`
  const keep = d.keep === 'highest' ? ' (el más alto)' : d.keep === 'lowest' ? ' (el más bajo)' : ''
  return `${base}${plus}${keep}`
}

/** ¿Hay que introducir los dados uno a uno? (keep highest/lowest no se puede deducir del total). */
export function requiresIndividualDice(spec: DiceSpec): boolean {
  return normalizeDice(spec).keep !== undefined
}

export function isValidFace(sides: number, value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= sides
}

/** Total de unos dados ya tirados (caras individuales), aplicando keep y plus. */
export function totalFromFaces(spec: DiceSpec, faces: readonly number[]): number {
  const d = normalizeDice(spec)
  if (faces.length !== d.dice) throw new DiceError(`Se esperaban ${d.dice} dados y llegaron ${faces.length}`)
  for (const f of faces) {
    if (!isValidFace(d.sides, f)) throw new DiceError(`Valor imposible para un D${d.sides}: ${f}`)
  }
  const kept =
    d.keep === 'highest'
      ? Math.max(...faces)
      : d.keep === 'lowest'
        ? Math.min(...faces)
        : faces.reduce((a, b) => a + b, 0)
  return kept + d.plus
}

/** ¿Es un total introducido directamente posible para este dado? */
export function isValidTotal(spec: DiceSpec, total: number): boolean {
  const { min, max } = diceRange(spec)
  return Number.isInteger(total) && total >= min && total <= max
}

/**
 * Entrada de D100 escrita por el jugador. Según el libro, "00" es 100.
 * Acepta "1".."100", "01".."09" y "00"/"0" → 100.
 */
export function parseD100Entry(input: string): number | null {
  const s = input.trim()
  if (!/^\d{1,3}$/.test(s)) return null
  if (s === '0' || s === '00') return 100
  const n = Number(s)
  return n >= 1 && n <= 100 ? n : null
}

export function rollDie(sides: number, rng: Rng): number {
  const r = rng()
  if (!(r >= 0 && r < 1)) throw new DiceError(`El generador devolvió un valor fuera de [0,1): ${r}`)
  return Math.floor(r * sides) + 1
}

export interface DiceRoll {
  dice: number[]
  total: number
}

export function rollDice(spec: DiceSpec, rng: Rng): DiceRoll {
  const d = normalizeDice(spec)
  const dice = Array.from({ length: d.dice }, () => rollDie(d.sides, rng))
  return { dice, total: totalFromFaces(spec, dice) }
}

/** Tira una fórmula de texto del libro ("1D3+1", "1D6") o devuelve el número si es fijo. */
export function rollFormula(formula: string | number, rng: Rng): DiceRoll {
  if (typeof formula === 'number') return { dice: [], total: formula }
  if (/^\s*-?\d+\s*$/.test(formula)) return { dice: [], total: Number(formula) }
  return rollDice(parseDiceNotation(formula), rng)
}

export function isDiceFormula(value: string | number): value is string {
  return typeof value === 'string' && NOTATION.test(value)
}
