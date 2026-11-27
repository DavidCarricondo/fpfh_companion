import type { TableDef } from './types'

/** Tablas mínimas para tests del motor (no son contenido del libro). */
export const simple: TableDef = {
  id: 'simple',
  name: 'Simple Table',
  page: 1,
  dice: 'D6',
  group: 'world',
  verified: true,
  rows: [
    { range: [1, 2], result: 'Low' },
    { range: [3, 5], result: 'Mid', next: [{ tableId: 'sub', times: 2, label: 'Roll sub twice' }] },
    { range: [6, 6], result: 'High', next: [{ tableId: 'sub' }, { tableId: 'multi', column: 'b' }] },
  ],
}

export const multi: TableDef = {
  id: 'multi',
  name: 'Multi Table',
  page: 2,
  dice: 'D10',
  group: 'battle',
  verified: true,
  columns: [
    { id: 'a', label: 'Column A' },
    { id: 'b', label: 'Column B' },
  ],
  rows: [
    { range: { a: [1, 5], b: [1, 2] }, result: 'First' },
    { range: { a: [6, 10] }, result: 'Only in A' },
    { range: { b: [3, 10] }, result: 'Only in B' },
  ],
}

export const keepHighest: TableDef = {
  id: 'kh',
  name: 'Keep Highest',
  page: 3,
  dice: { dice: 2, sides: 6, keep: 'highest' },
  group: 'battle',
  verified: true,
  rows: [
    { range: [1, 3], result: 'Few' },
    { range: [4, 6], result: 'Many' },
  ],
}

export const reference: TableDef = {
  id: 'ref',
  name: 'Reference',
  page: 4,
  group: 'post-battle',
  verified: true,
  rows: [{ result: 'Reactions' }],
}
