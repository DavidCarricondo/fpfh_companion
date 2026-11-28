import { describe, expect, it } from 'vitest'
import { steps } from '../../content'
import { DERIVED_FLAGS, flagsForSteps } from '../../engine/steps'
import { FLAG_LABELS, flagLabel } from './flags'

describe('flags de los pasos', () => {
  it('todo flag del contenido tiene pregunta en español (o se deriva)', () => {
    const missing = flagsForSteps(steps).filter((f) => !FLAG_LABELS[f] && !DERIVED_FLAGS.includes(f))
    expect(missing).toEqual([])
  })
  it('flagLabel cae al id si no hay etiqueta', () => {
    expect(flagLabel('traveling')).toBe('¿Viajas este turno?')
    expect(flagLabel('zzz')).toBe('zzz')
  })
})
