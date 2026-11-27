/**
 * Validación del contenido (spec §12.1). Puro: recibe el contenido ya leído
 * y devuelve errores y avisos. Lo usan `npm run validate:content` y los tests.
 */
import type { z } from 'zod'
import { diceRange } from '../engine/dice'
import type { GlossaryTerm, Range, StepDef, TableDef } from '../engine/types'
import { glossaryFileSchema, stepFileSchema, tableSchema } from './schema'

export interface RawFile {
  /** Ruta relativa, para los mensajes. */
  path: string
  data: unknown
}

export interface RawContent {
  tables: RawFile[]
  steps: RawFile[]
  glossary?: RawFile
}

export interface Issue {
  file: string
  message: string
}

export interface ValidationReport {
  errors: Issue[]
  warnings: Issue[]
  tables: TableDef[]
  steps: StepDef[]
  glossary: GlossaryTerm[]
}

export interface ValidateOptions {
  /** Ids de checks implementados en el motor (v2). */
  knownChecks?: readonly string[]
}

function zodIssues(file: string, error: z.ZodError): Issue[] {
  return error.issues.map((i) => ({
    file,
    message: `${i.path.length ? i.path.join('.') + ': ' : ''}${i.message}`,
  }))
}

/** Huecos y solapes de una lista de rangos frente a [min, max]. */
export function coverageProblems(
  ranges: { range: Range; label: string }[],
  min: number,
  max: number,
): string[] {
  const problems: string[] = []
  const sorted = [...ranges].sort((a, b) => a.range[0] - b.range[0] || a.range[1] - b.range[1])
  let expected = min
  for (const { range, label } of sorted) {
    const [lo, hi] = range
    if (lo < min || hi > max)
      problems.push(`"${label}" (${lo}-${hi}) se sale del rango del dado ${min}-${max}`)
    if (lo > expected) problems.push(`hueco ${expected}-${lo - 1}`)
    else if (lo < expected) problems.push(`solape en ${lo}-${Math.min(hi, expected - 1)} ("${label}")`)
    expected = Math.max(expected, hi + 1)
  }
  if (expected <= max) problems.push(`hueco ${expected}-${max}`)
  return problems
}

function checkCoverage(file: string, t: TableDef, errors: Issue[]): void {
  if (!t.dice) return
  const { min, max } = diceRange(t.dice)
  const columns = t.columns?.map((c) => c.id) ?? [undefined]
  for (const col of columns) {
    const ranges = t.rows.flatMap((row) => {
      const r = row.range
      const range = r === undefined ? undefined : Array.isArray(r) ? r : col ? r[col] : undefined
      return range ? [{ range, label: row.result }] : []
    })
    for (const p of coverageProblems(ranges, min, max)) {
      errors.push({ file, message: `cobertura${col ? ` (columna ${col})` : ''}: ${p}` })
    }
  }
}

const PAGE_MIN = 1
const PAGE_MAX = 200
function pages(p: number | number[]): number[] {
  return Array.isArray(p) ? p : [p]
}

/** Tablas desde las que es imposible terminar una cadena de tiradas (bucle forzoso). */
export function tablesWithoutExit(tables: readonly TableDef[]): string[] {
  const byId = new Map(tables.map((t) => [t.id, t]))
  const terminates = new Set<string>()
  let changed = true
  while (changed) {
    changed = false
    for (const t of tables) {
      if (terminates.has(t.id)) continue
      const ok = t.rows.some((row) =>
        (row.next ?? []).every(
          (n) => !byId.has(n.tableId) /* referencia rota: se informa aparte */ || terminates.has(n.tableId),
        ),
      )
      if (ok) {
        terminates.add(t.id)
        changed = true
      }
    }
  }
  return tables.filter((t) => !terminates.has(t.id)).map((t) => t.id)
}

/** Términos marcados en el texto de los pasos: [[Held the Field]] */
export function glossaryRefs(text: string): string[] {
  return [...text.matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => m[1]!.trim())
}

export function validateContent(raw: RawContent, opts: ValidateOptions = {}): ValidationReport {
  const errors: Issue[] = []
  const warnings: Issue[] = []
  const tables: { file: string; table: TableDef }[] = []
  const steps: { file: string; step: StepDef }[] = []
  let glossary: GlossaryTerm[] = []
  const glossaryFile = raw.glossary?.path ?? 'glossary.json'

  // 1. Esquemas
  for (const f of raw.tables) {
    const r = tableSchema.safeParse(f.data)
    if (!r.success) errors.push(...zodIssues(f.path, r.error))
    else {
      const { $schema: _s, ...table } = r.data
      tables.push({ file: f.path, table })
    }
  }
  for (const f of raw.steps) {
    const r = stepFileSchema.safeParse(f.data)
    if (!r.success) errors.push(...zodIssues(f.path, r.error))
    else steps.push(...r.data.steps.map((step) => ({ file: f.path, step })))
  }
  if (raw.glossary) {
    const r = glossaryFileSchema.safeParse(raw.glossary.data)
    if (!r.success) errors.push(...zodIssues(glossaryFile, r.error))
    else glossary = r.data.terms
  }

  // 2. Ids únicos
  const dup = <T>(items: T[], key: (x: T) => string, file: (x: T) => string, kind: string) => {
    const seen = new Map<string, string>()
    for (const x of items) {
      const k = key(x)
      if (seen.has(k))
        errors.push({ file: file(x), message: `${kind} duplicado "${k}" (también en ${seen.get(k)})` })
      else seen.set(k, file(x))
    }
  }
  dup(
    tables,
    (x) => x.table.id,
    (x) => x.file,
    'id de tabla',
  )
  dup(
    steps,
    (x) => x.step.id,
    (x) => x.file,
    'id de paso',
  )
  dup(
    glossary,
    (x) => x.id,
    () => glossaryFile,
    'id de término',
  )
  for (const { file, table } of tables) {
    const expected = file.replace(/^.*\//, '').replace(/\.json$/, '')
    if (expected !== table.id)
      errors.push({ file, message: `el nombre del archivo debe ser "${table.id}.json"` })
  }

  // 3. Cobertura de rangos y páginas
  for (const { file, table } of tables) {
    checkCoverage(file, table, errors)
    for (const p of pages(table.page)) {
      if (p < PAGE_MIN || p > PAGE_MAX)
        warnings.push({ file, message: `página ${p} fuera de ${PAGE_MIN}-${PAGE_MAX}` })
    }
    if (!table.verified) warnings.push({ file, message: 'sin verificar contra el libro (verified: false)' })
  }
  for (const { file, step } of steps) {
    for (const p of pages(step.page)) {
      if (p < PAGE_MIN || p > PAGE_MAX)
        warnings.push({ file, message: `paso "${step.id}": página ${p} fuera de ${PAGE_MIN}-${PAGE_MAX}` })
    }
  }

  // 4. Referencias
  const tableById = new Map(tables.map((x) => [x.table.id, x.table]))
  for (const { file, table } of tables) {
    table.rows.forEach((row, i) => {
      for (const n of row.next ?? []) {
        const target = tableById.get(n.tableId)
        if (!target) {
          errors.push({ file, message: `rows.${i}.next: la tabla "${n.tableId}" no existe` })
          continue
        }
        if (!target.dice)
          errors.push({
            file,
            message: `rows.${i}.next: "${n.tableId}" es de referencia y no se puede tirar`,
          })
        const hasCols = (target.columns?.length ?? 0) > 0
        if (n.column && !target.columns?.some((c) => c.id === n.column)) {
          errors.push({ file, message: `rows.${i}.next: "${n.tableId}" no tiene la columna "${n.column}"` })
        }
        if (hasCols && !n.column)
          warnings.push({
            file,
            message: `rows.${i}.next: "${n.tableId}" es multicolumna; no se indica columna`,
          })
      }
    })
  }
  const termNames = new Set(
    glossary.flatMap((g) => [g.term, ...(g.aliases ?? [])].map((s) => s.toLowerCase())),
  )
  const knownChecks = new Set(opts.knownChecks ?? [])
  for (const { file, step } of steps) {
    for (const t of step.tables ?? []) {
      if (!tableById.has(t)) errors.push({ file, message: `paso "${step.id}": la tabla "${t}" no existe` })
    }
    if (step.check && !knownChecks.has(step.check))
      errors.push({ file, message: `paso "${step.id}": el check "${step.check}" no existe` })
    for (const term of glossaryRefs(step.body)) {
      if (!termNames.has(term.toLowerCase()))
        errors.push({ file, message: `paso "${step.id}": término de glosario desconocido [[${term}]]` })
    }
  }

  // 5. Ciclos sin salida
  for (const id of tablesWithoutExit(tables.map((x) => x.table))) {
    const file = tables.find((x) => x.table.id === id)!.file
    errors.push({ file, message: 'el encadenado forma un bucle sin salida: ninguna fila termina la cadena' })
  }

  return { errors, warnings, tables: tables.map((x) => x.table), steps: steps.map((x) => x.step), glossary }
}
