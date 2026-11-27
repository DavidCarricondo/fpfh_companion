/**
 * Carga del contenido empaquetado (content/*.json). Vite lo incluye en el bundle,
 * así que queda en el precache del service worker y funciona sin red.
 */
import type { GlossaryTerm, StepDef, TableDef } from '../engine/types'
import { glossaryFileSchema, stepFileSchema, tableSchema } from './schema'

const tableModules = import.meta.glob('../../content/tables/*.json', { eager: true, import: 'default' })
const stepModules = import.meta.glob('../../content/steps/*.json', { eager: true, import: 'default' })
const glossaryModules = import.meta.glob('../../content/glossary.json', { eager: true, import: 'default' })

function parseTables(): TableDef[] {
  return Object.entries(tableModules)
    .map(([path, data]) => {
      const r = tableSchema.safeParse(data)
      if (!r.success) throw new Error(`Contenido no válido en ${path}: ${r.error.message}`)
      const { $schema: _s, ...table } = r.data
      return table
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

export const tables: readonly TableDef[] = parseTables()
const tableById = new Map(tables.map((t) => [t.id, t]))

export function getTable(id: string): TableDef | undefined {
  return tableById.get(id)
}

export const steps: readonly StepDef[] = Object.values(stepModules).flatMap(
  (data) => stepFileSchema.parse(data).steps,
)

export const glossary: readonly GlossaryTerm[] = Object.values(glossaryModules).flatMap(
  (data) => glossaryFileSchema.parse(data).terms,
)
