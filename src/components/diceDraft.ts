/**
 * Borrador de lo que el jugador teclea en DiceInput (F1.10) y su conversión a entrada del motor.
 */
import {
  diceRange,
  formatDice,
  isValidFace,
  normalizeDice,
  parseD100Entry,
  requiresIndividualDice,
  type DiceSpec,
} from '../engine/dice'

export interface DiceDraft {
  mode: 'total' | 'dice'
  total: string
  faces: string[]
}

export type DraftResult =
  { kind: 'empty' } | { kind: 'error'; message: string } | { kind: 'ok'; dice?: number[]; natural?: number }

export function emptyDraft(spec: DiceSpec): DiceDraft {
  const d = normalizeDice(spec)
  return {
    mode: requiresIndividualDice(spec) ? 'dice' : 'total',
    total: '',
    faces: Array.from({ length: d.dice }, () => ''),
  }
}

/** Draft a partir de unos dados ya tirados (Tirar por mí). */
export function draftFromFaces(spec: DiceSpec, faces: readonly number[]): DiceDraft {
  const d = normalizeDice(spec)
  if (d.dice === 1 && !d.keep)
    return { mode: 'total', total: String(faces[0]! + d.plus), faces: [String(faces[0])] }
  return { mode: 'dice', total: '', faces: faces.map(String) }
}

/** ¿Se puede elegir entre total y dado a dado? */
export function canSwitchMode(spec: DiceSpec): boolean {
  const d = normalizeDice(spec)
  return d.dice > 1 && !d.keep
}

/** Es un D100 "puro", donde 00 = 100. */
export function isPercentile(spec: DiceSpec): boolean {
  const d = normalizeDice(spec)
  return d.dice === 1 && d.sides === 100 && d.plus === 0
}

/** Máximo de cifras que tiene sentido teclear en un campo. */
export function maxDigits(spec: DiceSpec, mode: DiceDraft['mode']): number {
  if (mode === 'dice') return String(normalizeDice(spec).sides).length
  return String(diceRange(spec).max).length
}

export function readDraft(spec: DiceSpec, draft: DiceDraft): DraftResult {
  const d = normalizeDice(spec)
  if (draft.mode === 'total') {
    const s = draft.total.trim()
    if (!s) return { kind: 'empty' }
    const { min, max } = diceRange(spec)
    const n = isPercentile(spec) ? parseD100Entry(s) : /^\d+$/.test(s) ? Number(s) : null
    if (n === null || n < min || n > max)
      return { kind: 'error', message: `Imposible con ${formatDice(spec)} (${min}–${max})` }
    return { kind: 'ok', natural: n }
  }
  if (draft.faces.every((f) => !f.trim())) return { kind: 'empty' }
  const faces: number[] = []
  for (const f of draft.faces) {
    const s = f.trim()
    if (!s) return { kind: 'empty' }
    const n = d.sides === 100 && (s === '0' || s === '00') ? 100 : Number(s)
    if (!/^\d+$/.test(s) || !isValidFace(d.sides, n))
      return { kind: 'error', message: `Un D${d.sides} va de 1 a ${d.sides}` }
    faces.push(n)
  }
  return { kind: 'ok', dice: faces }
}
