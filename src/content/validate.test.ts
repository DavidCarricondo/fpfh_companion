import { describe, expect, it } from 'vitest'
import { coverageProblems, glossaryRefs, tablesWithoutExit, validateContent, type RawFile } from './validate'
import { multi, simple } from '../engine/fixtures'
import type { TableDef } from '../engine/types'

const file = (t: object, name?: string): RawFile => ({
  path: `content/tables/${name ?? (t as TableDef).id}.json`,
  data: t,
})
const sub: TableDef = {
  id: 'sub',
  name: 'Sub',
  page: 5,
  dice: 'D3',
  group: 'loot',
  verified: true,
  rows: [{ range: [1, 3], result: 'x' }],
}
const messages = (r: ReturnType<typeof validateContent>) => r.errors.map((e) => e.message)

describe('coverageProblems', () => {
  const r = (lo: number, hi: number) => ({ range: [lo, hi] as [number, number], label: `${lo}-${hi}` })
  it('cobertura exacta', () => {
    expect(coverageProblems([r(1, 3), r(4, 6)], 1, 6)).toEqual([])
    expect(coverageProblems([r(4, 6), r(1, 3)], 1, 6)).toEqual([])
  })
  it('huecos, solapes y desbordes', () => {
    expect(coverageProblems([r(1, 2), r(4, 6)], 1, 6)).toEqual(['hueco 3-3'])
    expect(coverageProblems([r(1, 4), r(3, 6)], 1, 6)).toEqual(['solape en 3-4 ("3-6")'])
    expect(coverageProblems([r(1, 5)], 1, 6)).toEqual(['hueco 6-6'])
    expect(coverageProblems([r(2, 7)], 1, 6)).toEqual([
      '"2-7" (2-7) se sale del rango del dado 1-6',
      'hueco 1-1',
    ])
    expect(coverageProblems([], 1, 6)).toEqual(['hueco 1-6'])
  })
})

describe('validateContent', () => {
  it('contenido correcto', () => {
    const r = validateContent({ tables: [file(simple), file(multi), file(sub)], steps: [] })
    expect(r.errors).toEqual([])
    expect(r.tables).toHaveLength(3)
  })

  it('errores de esquema', () => {
    const r = validateContent({
      tables: [file({ id: 'Bad Id', name: '', page: 0, group: 'x', rows: [] }, 'bad')],
      steps: [],
    })
    expect(r.errors.length).toBeGreaterThan(3)
  })

  it('rangos y columnas incoherentes', () => {
    const t = { ...simple, rows: [{ range: { a: [1, 6] }, result: 'x' }, { result: 'y' }] }
    const m = {
      ...multi,
      rows: [
        { range: [1, 10], result: 'x' },
        { range: { zz: [1, 10] }, result: 'y' },
      ],
    }
    const ref = {
      id: 'ref',
      name: 'R',
      page: 1,
      group: 'world',
      verified: true,
      rows: [{ range: [1, 2], result: 'x' }],
    }
    const msgs = messages(validateContent({ tables: [file(t), file(m), file(ref)], steps: [] }))
    expect(msgs).toContain('rows.0.range: rango por columna en una tabla sin columnas')
    expect(msgs).toContain('rows.1.range: falta el rango')
    expect(msgs).toContain('rows.0.range: tabla multicolumna: el rango debe ir por columna')
    expect(msgs).toContain('rows.1.range: columna desconocida "zz"')
    expect(msgs).toContain('rows.0.range: una tabla sin dado no lleva rangos')
  })

  it('campos sin declarar', () => {
    const t = { ...sub, rows: [{ range: [1, 3], result: 'x', fields: { foo: 1 } }] }
    expect(messages(validateContent({ tables: [file(t)], steps: [] }))).toContain(
      'rows.0.fields.foo: campo sin declarar en fieldDefs: "foo"',
    )
  })

  it('cobertura por columna', () => {
    const m = { ...multi, rows: multi.rows.slice(0, 2) }
    expect(messages(validateContent({ tables: [file(m)], steps: [] }))).toContain(
      'cobertura (columna b): hueco 3-10',
    )
  })

  it('referencias rotas, columnas y tablas de referencia', () => {
    const t: TableDef = {
      ...sub,
      id: 'refs',
      rows: [
        { range: [1, 1], result: 'a', next: [{ tableId: 'nope' }] },
        { range: [2, 2], result: 'b', next: [{ tableId: 'multi', column: 'zz' }] },
        { range: [3, 3], result: 'c', next: [{ tableId: 'refonly' }] },
      ],
    }
    const refonly = {
      id: 'refonly',
      name: 'R',
      page: 1,
      group: 'world',
      verified: true,
      rows: [{ result: 'x' }],
    }
    const r = validateContent({ tables: [file(t), file(multi), file(refonly)], steps: [] })
    expect(messages(r)).toEqual([
      'rows.0.next: la tabla "nope" no existe',
      'rows.1.next: "multi" no tiene la columna "zz"',
      'rows.2.next: "refonly" es de referencia y no se puede tirar',
    ])
  })

  it('aviso si se encadena a una multicolumna sin columna', () => {
    const t: TableDef = {
      ...sub,
      id: 'w',
      rows: [{ range: [1, 3], result: 'a', next: [{ tableId: 'multi' }] }],
    }
    const r = validateContent({ tables: [file(t), file(multi)], steps: [] })
    expect(r.warnings.map((w) => w.message)).toContain(
      'rows.0.next: "multi" es multicolumna; no se indica columna',
    )
  })

  it('ids duplicados y nombre de archivo', () => {
    const r = validateContent({ tables: [file(sub), file(sub, 'sub-copy')], steps: [] })
    expect(messages(r)).toContain('id de tabla duplicado "sub" (también en content/tables/sub.json)')
    expect(messages(r)).toContain('el nombre del archivo debe ser "sub.json"')
  })

  it('avisos: páginas y sin verificar', () => {
    const r = validateContent({ tables: [file({ ...sub, page: 999, verified: false })], steps: [] })
    expect(r.warnings.map((w) => w.message)).toEqual([
      'página 999 fuera de 1-200',
      'sin verificar contra el libro (verified: false)',
    ])
  })

  it('pasos y glosario', () => {
    const steps: RawFile = {
      path: 'content/steps/world.json',
      data: {
        steps: [
          {
            id: 'world.a',
            phase: 'world',
            section: '2.1',
            title: 'A',
            body: 'See [[Stunned]] and [[held the field]]',
            page: 76,
            tables: ['sub'],
          },
          {
            id: 'world.b',
            phase: 'world',
            section: '2.1',
            title: 'B',
            body: '[[Nope]]',
            page: 300,
            tables: ['zzz'],
            check: 'upkeep',
          },
          {
            id: 'world.b',
            phase: 'world',
            section: '2.1',
            title: 'B2',
            body: '',
            page: 76,
            when: { all: [{ flag: 'x' }, { not: { flag: 'y' } }] },
          },
        ],
      },
    }
    const glossary: RawFile = {
      path: 'content/glossary.json',
      data: {
        terms: [
          { id: 'stunned', term: 'Stunned', explanation: 'Aturdido', page: 40 },
          {
            id: 'held-the-field',
            term: 'Held the Field',
            aliases: ['Hold the Field'],
            explanation: '…',
            page: 114,
          },
        ],
      },
    }
    const r = validateContent({ tables: [file(sub)], steps: [steps], glossary }, { knownChecks: [] })
    expect(messages(r)).toEqual([
      'id de paso duplicado "world.b" (también en content/steps/world.json)',
      'paso "world.b": la tabla "zzz" no existe',
      'paso "world.b": el check "upkeep" no existe',
      'paso "world.b": término de glosario desconocido [[Nope]]',
    ])
    expect(r.warnings.map((w) => w.message)).toContain('paso "world.b": página 300 fuera de 1-200')
    expect(r.glossary).toHaveLength(2)
  })

  it('esquemas de pasos y glosario inválidos', () => {
    const r = validateContent({
      tables: [],
      steps: [{ path: 's.json', data: { steps: [{ id: 'x' }] } }],
      glossary: { path: 'g.json', data: { terms: [{ id: 'x' }] } },
    })
    expect(r.errors.some((e) => e.file === 's.json')).toBe(true)
    expect(r.errors.some((e) => e.file === 'g.json')).toBe(true)
  })
})

describe('ciclos', () => {
  const t = (id: string, rows: TableDef['rows']): TableDef => ({
    id,
    name: id,
    page: 1,
    dice: 'D6',
    group: 'loot',
    verified: true,
    rows,
  })
  it('"roll again on this table" con salida es válido', () => {
    expect(
      tablesWithoutExit([
        t('a', [
          { range: [1, 3], result: 'again', next: [{ tableId: 'a' }] },
          { range: [4, 6], result: 'stop' },
        ]),
      ]),
    ).toEqual([])
  })
  it('bucle forzoso', () => {
    const a = t('a', [{ range: [1, 6], result: 'to b', next: [{ tableId: 'b' }] }])
    const b = t('b', [{ range: [1, 6], result: 'to a', next: [{ tableId: 'a' }] }])
    const c = t('c', [{ range: [1, 6], result: 'to a', next: [{ tableId: 'a' }] }])
    expect(tablesWithoutExit([a, b, c])).toEqual(['a', 'b', 'c'])
    const r = validateContent({ tables: [a, b].map((x) => file(x)), steps: [] })
    expect(r.errors.map((e) => e.message)).toContain(
      'el encadenado forma un bucle sin salida: ninguna fila termina la cadena',
    )
  })
})

describe('glossaryRefs', () => {
  it('extrae términos', () => {
    expect(glossaryRefs('a [[Stunned]] b [[ Bail ]]')).toEqual(['Stunned', 'Bail'])
  })
})
