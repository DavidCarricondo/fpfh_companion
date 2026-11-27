/**
 * Tipos de contenido (spec §5). El esquema Zod equivalente vive en src/content/schema.ts
 * y se comprueba en compilación que ambos coinciden.
 */
import type { DiceSpec } from './dice'

export type TableGroup =
  'creation' | 'travel' | 'world' | 'battle' | 'post-battle' | 'equipment' | 'enemies' | 'loot' | 'campaign'

export type Range = [number, number]

export interface NextRoll {
  tableId: string
  /** "Roll twice" → 2 */
  times?: number
  column?: string
  /** Texto del botón: 'Roll Primary Alien' */
  label?: string
}

/** v2: efectos aplicables al estado. En v1 solo se transportan. */
export interface Effect {
  type: string
  [key: string]: unknown
}

export interface TableRow {
  /** Rango inclusivo, o un rango por columna en tablas multicolumna (puede faltar en alguna columna). */
  range?: Range | Record<string, Range>
  result: string
  detail?: string
  fields?: Record<string, string | number>
  next?: NextRoll[]
  effects?: Effect[]
  /** Página concreta si la fila remite a otra parte del libro. */
  page?: number
  errata?: string
}

export interface ColumnDef {
  id: string
  label: string
}

export interface FieldDef {
  id: string
  label: string
}

export interface TableDef {
  id: string
  name: string
  aliases?: string[]
  page: number | number[]
  /** Sin dado = tabla de referencia (p. ej. Ability Increase). */
  dice?: DiceSpec
  group: TableGroup
  columns?: ColumnDef[]
  /** Etiquetas de los campos estructurados de las filas, en el orden en que se muestran. */
  fieldDefs?: FieldDef[]
  rows: TableRow[]
  notes?: string
  /** Revisada fila a fila contra el libro. */
  verified: boolean
}

export type StepPhase = 'creation' | 'travel' | 'world' | 'battle-setup' | 'battle' | 'post-battle' | 'end'

export type Condition = { flag: string } | { all: Condition[] } | { any: Condition[] } | { not: Condition }

export interface StepDef {
  id: string
  phase: StepPhase
  section: string
  title: string
  body: string
  page: number | number[]
  tables?: string[]
  check?: string
  repeat?: 'per-crew' | 'per-round' | 'per-casualty'
  when?: Condition
  optional?: boolean
}

export interface GlossaryTerm {
  id: string
  term: string
  aliases?: string[]
  explanation: string
  page: number | number[]
}
