/**
 * npm run validate:content — valida content/ (spec §12.1). Sale con código 1 si hay errores.
 * Opciones: --quiet  oculta los avisos de tablas sin verificar.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { validateContent, type RawFile } from '../src/content/validate.ts'
import { KNOWN_CHECKS } from '../src/engine/checks.ts'

const root = join(import.meta.dirname, '..')
const contentDir = join(root, 'content')
const quiet = process.argv.includes('--quiet')

function readJsonDir(dir: string): RawFile[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => readJson(join(dir, f)))
}

function readJson(path: string): RawFile {
  const rel = relative(root, path)
  try {
    return { path: rel, data: JSON.parse(readFileSync(path, 'utf8')) }
  } catch (e) {
    console.error(`✖ ${rel}: JSON no válido — ${(e as Error).message}`)
    process.exit(1)
  }
}

const glossaryPath = join(contentDir, 'glossary.json')
const report = validateContent(
  {
    tables: readJsonDir(join(contentDir, 'tables')),
    steps: readJsonDir(join(contentDir, 'steps')),
    ...(existsSync(glossaryPath) ? { glossary: readJson(glossaryPath) } : {}),
  },
  { knownChecks: KNOWN_CHECKS },
)

const warnings = quiet ? report.warnings.filter((w) => !w.message.includes('verified')) : report.warnings
for (const w of warnings) console.warn(`⚠ ${w.file}: ${w.message}`)
for (const e of report.errors) console.error(`✖ ${e.file}: ${e.message}`)

const unverified = report.tables.filter((t) => !t.verified).length
console.log(
  `\n${report.tables.length} tablas (${unverified} sin verificar), ${report.steps.length} pasos, ${report.glossary.length} términos de glosario.`,
)
if (report.errors.length) {
  console.error(`${report.errors.length} error(es).`)
  process.exit(1)
}
console.log('Contenido válido.')
