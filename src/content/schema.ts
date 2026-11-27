/**
 * Esquemas Zod del contenido (spec §5). Deben coincidir con src/engine/types.ts;
 * las aserciones de tipo del final rompen la compilación si se desalinean.
 */
import { z } from 'zod'
import { normalizeDice } from '../engine/dice'
import type { Condition, GlossaryTerm, StepDef, TableDef } from '../engine/types'

const int = z.number().int()
const page = z.union([int.positive(), z.array(int.positive()).nonempty()])
const id = z.string().regex(/^[a-z0-9]+(?:[-.][a-z0-9]+)*$/, 'id en kebab-case (a-z, 0-9, guiones, puntos)')

export const rangeSchema = z
  .tuple([int, int])
  .refine(([a, b]) => a <= b, 'el inicio del rango no puede ser mayor que el final')

export const diceSpecSchema = z
  .union([
    z.enum(['D3', 'D6', 'D10', 'D100', '2D6', '3D6']),
    z.strictObject({
      dice: int.positive(),
      sides: int.min(2),
      keep: z.enum(['highest', 'lowest']).optional(),
      plus: int.optional(),
    }),
  ])
  .superRefine((spec, ctx) => {
    try {
      normalizeDice(spec)
    } catch (e) {
      ctx.addIssue({ code: 'custom', message: (e as Error).message })
    }
  })

export const nextRollSchema = z.strictObject({
  tableId: id,
  times: int.min(1).optional(),
  column: z.string().optional(),
  label: z.string().optional(),
})

export const effectSchema = z.looseObject({ type: z.string() })

export const tableRowSchema = z.strictObject({
  range: z.union([rangeSchema, z.record(z.string(), rangeSchema)]).optional(),
  result: z.string().min(1),
  detail: z.string().optional(),
  fields: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
  next: z.array(nextRollSchema).optional(),
  effects: z.array(effectSchema).optional(),
  page: int.positive().optional(),
  errata: z.string().optional(),
})

export const tableGroupSchema = z.enum([
  'creation',
  'travel',
  'world',
  'battle',
  'post-battle',
  'equipment',
  'enemies',
  'loot',
  'campaign',
])

const labelled = z.strictObject({ id: z.string().min(1), label: z.string().min(1) })

export const tableSchema = z
  .strictObject({
    $schema: z.string().optional(),
    id,
    name: z.string().min(1),
    aliases: z.array(z.string()).optional(),
    page,
    dice: diceSpecSchema.optional(),
    group: tableGroupSchema,
    columns: z.array(labelled).nonempty().optional(),
    fieldDefs: z.array(labelled).optional(),
    rows: z.array(tableRowSchema).nonempty(),
    notes: z.string().optional(),
    verified: z.boolean(),
  })
  .superRefine((t, ctx) => {
    const columnIds = new Set(t.columns?.map((c) => c.id))
    t.rows.forEach((row, i) => {
      const path = ['rows', i, 'range']
      if (!t.dice) {
        if (row.range !== undefined)
          ctx.addIssue({ code: 'custom', path, message: 'una tabla sin dado no lleva rangos' })
        return
      }
      if (row.range === undefined) {
        ctx.addIssue({ code: 'custom', path, message: 'falta el rango' })
      } else if (Array.isArray(row.range)) {
        if (columnIds.size > 0)
          ctx.addIssue({ code: 'custom', path, message: 'tabla multicolumna: el rango debe ir por columna' })
      } else {
        if (columnIds.size === 0)
          ctx.addIssue({ code: 'custom', path, message: 'rango por columna en una tabla sin columnas' })
        for (const key of Object.keys(row.range)) {
          if (!columnIds.has(key))
            ctx.addIssue({ code: 'custom', path, message: `columna desconocida "${key}"` })
        }
      }
      const fieldIds = new Set(t.fieldDefs?.map((f) => f.id))
      for (const key of Object.keys(row.fields ?? {})) {
        if (!fieldIds.has(key)) {
          ctx.addIssue({
            code: 'custom',
            path: ['rows', i, 'fields', key],
            message: `campo sin declarar en fieldDefs: "${key}"`,
          })
        }
      }
    })
  })

export const conditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.union([
    z.strictObject({ flag: z.string().min(1) }),
    z.strictObject({ all: z.array(conditionSchema) }),
    z.strictObject({ any: z.array(conditionSchema) }),
    z.strictObject({ not: conditionSchema }),
  ]),
)

export const stepSchema = z.strictObject({
  id,
  phase: z.enum(['creation', 'travel', 'world', 'battle-setup', 'battle', 'post-battle', 'end']),
  section: z.string().min(1),
  title: z.string().min(1),
  body: z.string(),
  page,
  tables: z.array(id).optional(),
  check: z.string().optional(),
  repeat: z.enum(['per-crew', 'per-round', 'per-casualty']).optional(),
  when: conditionSchema.optional(),
  optional: z.boolean().optional(),
})

export const stepFileSchema = z.strictObject({
  $schema: z.string().optional(),
  steps: z.array(stepSchema),
})

export const glossaryTermSchema = z.strictObject({
  id,
  term: z.string().min(1),
  aliases: z.array(z.string()).optional(),
  explanation: z.string().min(1),
  page,
})

export const glossaryFileSchema = z.strictObject({
  $schema: z.string().optional(),
  terms: z.array(glossaryTermSchema),
})

// --- Comprobación en compilación: Zod ≡ tipos del motor -------------------------------------
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false
type Assert<T extends true> = T
type ParsedTable = Omit<z.infer<typeof tableSchema>, '$schema'>
// Los tipos del motor usan el DiceSpec del motor; Zod lo describe con la misma forma.
export type _TableMatches = Assert<Equals<ParsedTable['rows'], TableDef['rows']>>
export type _StepMatches = Assert<Equals<z.infer<typeof stepSchema>, StepDef>>
export type _GlossaryMatches = Assert<Equals<z.infer<typeof glossaryTermSchema>, GlossaryTerm>>
export const _tableAssignable = (t: ParsedTable): TableDef => t
