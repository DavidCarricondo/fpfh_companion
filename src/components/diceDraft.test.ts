import { describe, expect, it } from 'vitest'
import {
  canSwitchMode,
  draftFromFaces,
  emptyDraft,
  isPercentile,
  maxDigits,
  readDraft,
  type DiceDraft,
} from './diceDraft'

const total = (s: string): DiceDraft => ({ mode: 'total', total: s, faces: [] })
const dice = (...f: string[]): DiceDraft => ({ mode: 'dice', total: '', faces: f })

describe('diceDraft', () => {
  it('emptyDraft: keep highest obliga a dado a dado', () => {
    expect(emptyDraft('2D6')).toEqual({ mode: 'total', total: '', faces: ['', ''] })
    expect(emptyDraft({ dice: 2, sides: 6, keep: 'highest' }).mode).toBe('dice')
  })

  it('D100: 00 = 100, 01 = 1, fuera de rango es error', () => {
    expect(readDraft('D100', total(''))).toEqual({ kind: 'empty' })
    expect(readDraft('D100', total('00'))).toEqual({ kind: 'ok', natural: 100 })
    expect(readDraft('D100', total('01'))).toEqual({ kind: 'ok', natural: 1 })
    expect(readDraft('D100', total('100'))).toEqual({ kind: 'ok', natural: 100 })
    expect(readDraft('D100', total('101'))).toMatchObject({ kind: 'error' })
  })

  it('2D6: total entre 2 y 12', () => {
    expect(readDraft('2D6', total('1'))).toEqual({ kind: 'error', message: 'Imposible con 2D6 (2–12)' })
    expect(readDraft('2D6', total('13'))).toMatchObject({ kind: 'error' })
    expect(readDraft('2D6', total('7'))).toEqual({ kind: 'ok', natural: 7 })
    expect(readDraft('D6', total('x'))).toMatchObject({ kind: 'error' })
  })

  it('dado a dado', () => {
    expect(readDraft('2D6', dice('', ''))).toEqual({ kind: 'empty' })
    expect(readDraft('2D6', dice('3', ''))).toEqual({ kind: 'empty' })
    expect(readDraft('2D6', dice('3', '7'))).toEqual({ kind: 'error', message: 'Un D6 va de 1 a 6' })
    expect(readDraft('2D6', dice('3', '5'))).toEqual({ kind: 'ok', dice: [3, 5] })
    expect(readDraft({ dice: 2, sides: 100 }, dice('00', '4'))).toEqual({ kind: 'ok', dice: [100, 4] })
  })

  it('draftFromFaces', () => {
    expect(draftFromFaces('D100', [42])).toEqual({ mode: 'total', total: '42', faces: ['42'] })
    expect(draftFromFaces({ dice: 1, sides: 6, plus: 1 }, [3]).total).toBe('4')
    expect(draftFromFaces('2D6', [2, 5])).toEqual({ mode: 'dice', total: '', faces: ['2', '5'] })
  })

  it('utilidades', () => {
    expect(canSwitchMode('2D6')).toBe(true)
    expect(canSwitchMode('D6')).toBe(false)
    expect(canSwitchMode({ dice: 2, sides: 6, keep: 'lowest' })).toBe(false)
    expect(isPercentile('D100')).toBe(true)
    expect(isPercentile('D10')).toBe(false)
    expect(maxDigits('D100', 'total')).toBe(3)
    expect(maxDigits('2D6', 'total')).toBe(2)
    expect(maxDigits('2D6', 'dice')).toBe(1)
  })
})
