import { describe, expect, it } from 'vitest'
import { buildTermIndex, plainGlossaryText, splitGlossaryText } from './glossary'
import { normalizeSearch, searchGlossary, searchTables } from './search'
import { multi, reference, simple } from './fixtures'
import type { GlossaryTerm, TableDef } from './types'

const terms: GlossaryTerm[] = [
  { id: 'bail', term: 'Bail', explanation: 'Huir del combate.', page: 40 },
  {
    id: 'htf',
    term: 'Held the Field',
    aliases: ['HtF'],
    explanation: 'Te quedas con el tablero.',
    page: 114,
  },
]

describe('glosario', () => {
  it('splitGlossaryText', () => {
    expect(splitGlossaryText('Huye ([[Bail]]) y [[ Held the Field ]].')).toEqual([
      { text: 'Huye (' },
      { term: 'Bail' },
      { text: ') y ' },
      { term: 'Held the Field' },
      { text: '.' },
    ])
    expect(splitGlossaryText('[[Bail]]')).toEqual([{ term: 'Bail' }])
    expect(splitGlossaryText('sin marcas')).toEqual([{ text: 'sin marcas' }])
  })
  it('plainGlossaryText', () => {
    expect(plainGlossaryText('a [[Bail]] b')).toBe('a Bail b')
  })
  it('buildTermIndex por término y alias, sin mayúsculas', () => {
    const idx = buildTermIndex(terms)
    expect(idx.get('htf')?.id).toBe('htf')
    expect(idx.get('bail')?.id).toBe('bail')
  })
})

describe('buscadores', () => {
  it('normalizeSearch quita tildes', () => {
    expect(normalizeSearch('Batalla de Invasión')).toBe('batalla de invasion')
  })
  it('searchGlossary: nombre antes que explicación', () => {
    expect(searchGlossary(terms, '')).toHaveLength(2)
    expect(searchGlossary(terms, 'htf').map((t) => t.id)).toEqual(['htf'])
    expect(searchGlossary(terms, 'combáte').map((t) => t.id)).toEqual(['bail'])
  })
  it('searchTables por nombre, alias, id y página', () => {
    const tables: TableDef[] = [simple, { ...multi, aliases: ['Deploy'], page: [70, 72] }, reference]
    expect(searchTables(tables, '  ')).toHaveLength(3)
    expect(searchTables(tables, 'simple').map((t) => t.id)).toEqual(['simple'])
    expect(searchTables(tables, 'deploy').map((t) => t.id)).toEqual(['multi'])
    expect(searchTables(tables, 'ref').map((t) => t.id)).toEqual(['ref'])
    expect(searchTables(tables, '71').map((t) => t.id)).toEqual(['multi'])
    expect(searchTables(tables, 'p. 4').map((t) => t.id)).toEqual(['ref'])
    expect(searchTables(tables, '1').map((t) => t.id)).toEqual(['simple'])
  })
})
