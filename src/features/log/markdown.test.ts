import { describe, expect, it } from 'vitest'
import type { Campaign, LogEntry } from '../../store/types'
import { logToMarkdown, markdownFileName } from './markdown'

const campaign: Campaign = {
  id: 'c1',
  name: 'Nova Rest',
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-01T10:00:00.000Z',
  schemaVersion: 1,
  turn: 7,
  settings: { crewSize: 6, difficulty: 'normal', storyTrack: false, battleEvents: false },
}

let seq = 0
const e = (over: Partial<LogEntry>): LogEntry => ({
  id: `e${++seq}`,
  campaignId: 'c1',
  turn: 7,
  at: '2026-11-27T20:00:00.000Z',
  kind: 'roll',
  text: '',
  ...over,
})

const exportedAt = new Date(2026, 10, 27)

describe('logToMarkdown', () => {
  it('sigue la plantilla de §8.3: turnos, fases en orden, notas y encadenado', () => {
    const loot = e({ phase: 'post-battle', text: 'Loot Table (D100=10): Weapon' })
    const log: LogEntry[] = [
      e({ turn: 0, phase: 'creation', kind: 'state-change', text: 'Campaña creada: Nova Rest' }),
      e({ turn: 0, phase: 'creation', text: 'Crew Type (D100=12): Baseline Human' }),
      e({ phase: 'post-battle', text: 'Injury Table (D100=48): Serious injury', note: 'Simon\n3 turnos' }),
      e({ phase: 'world', text: 'Exploration Table (D100=14): Nada', note: 'Twitch se pierde' }),
      e({ phase: 'world', kind: 'step-done', text: 'Paso completado: Explorar' }),
      e({ kind: 'state-change', text: '¿Viajas este turno? → No' }),
      loot,
      e({ phase: 'post-battle', text: 'Weapon Category (D100=20): Slug Weapons', parentId: loot.id }),
      e({ phase: 'post-battle', text: 'Deshecha', undone: true }),
      e({ kind: 'note', text: 'Buena partida' }),
      e({ campaignId: 'otra', text: 'De otra campaña' }),
    ]
    expect(logToMarkdown(campaign, log, exportedAt)).toBe(
      [
        '# Nova Rest',
        '',
        '_Exportado el 27 de noviembre de 2026 · Turno 7_',
        '',
        '## Creación de la campaña',
        '',
        '- Crew Type (D100=12): Baseline Human',
        '',
        '## Turno 7',
        '',
        '### Mundo',
        '',
        '- Exploration Table (D100=14): Nada',
        '  > Nota: Twitch se pierde',
        '',
        '### Post-batalla',
        '',
        '- Injury Table (D100=48): Serious injury',
        '  > Nota: Simon',
        '  > 3 turnos',
        '- Loot Table (D100=10): Weapon',
        '  - Weapon Category (D100=20): Slug Weapons',
        '',
        '### Otros',
        '',
        '- Buena partida',
        '',
      ].join('\n'),
    )
  })

  it('encadenada cuyo padre se deshizo: se muestra suelta', () => {
    const parent = e({ phase: 'world', text: 'Padre', undone: true })
    const md = logToMarkdown(
      campaign,
      [parent, e({ phase: 'world', text: 'Hija', parentId: parent.id })],
      exportedAt,
    )
    expect(md).toContain('\n- Hija\n')
    expect(md).not.toContain('Padre')
  })

  it('diario vacío', () => {
    expect(logToMarkdown(campaign, [], exportedAt)).toContain('_El diario está vacío._')
  })
})

describe('markdownFileName', () => {
  it('slug sin tildes y fecha local', () => {
    expect(markdownFileName({ ...campaign, name: 'Camión  Ñu!' }, exportedAt)).toBe(
      'diario-camion-nu-2026-11-27.md',
    )
    expect(markdownFileName({ ...campaign, name: '¡¡!!' }, exportedAt)).toBe('diario-campana-2026-11-27.md')
  })
})
