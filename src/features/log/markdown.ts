/**
 * Exportación del diario a Markdown (F1.20) con la plantilla de la spec §8.3.
 * Puro: recibe la fecha de exportación para que el resultado sea reproducible.
 *
 * Es una crónica: incluye tiradas, notas y batallas; omite pasos marcados, respuestas a las
 * preguntas de fase y entradas deshechas.
 */
import type { StepPhase } from '../../engine/types'
import { CREATION_TURN, type Campaign, type LogEntry } from '../../store/types'
import { PHASE_LABELS } from '../labels'

const CHRONICLE_KINDS: ReadonlySet<LogEntry['kind']> = new Set(['roll', 'note', 'battle'])

/** Orden de las secciones dentro de un turno. Las tiradas sin fase (biblioteca) van al final. */
const PHASE_ORDER: readonly StepPhase[] = [
  'creation',
  'travel',
  'world',
  'battle-setup',
  'battle',
  'post-battle',
  'end',
]
const OTHER = 'Otros'

function sectionOf(e: LogEntry): string {
  return e.phase ? PHASE_LABELS[e.phase] : OTHER
}

const sectionOrder = [...new Set(PHASE_ORDER.map((p) => PHASE_LABELS[p])), OTHER]

function quote(note: string, indent: string): string[] {
  return note.split(/\r?\n/).map((line, i) => `${indent}> ${i === 0 ? 'Nota: ' : ''}${line}`)
}

function entryLines(e: LogEntry, depth: number): string[] {
  const indent = '  '.repeat(depth)
  const out = [`${indent}- ${e.text}`]
  if (e.note) out.push(...quote(e.note, `${indent}  `))
  return out
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function logToMarkdown(campaign: Campaign, log: readonly LogEntry[], exportedAt: Date): string {
  const entries = log.filter((e) => e.campaignId === campaign.id && !e.undone && CHRONICLE_KINDS.has(e.kind))
  const kept = new Set(entries.map((e) => e.id))
  const children = new Map<string, LogEntry[]>()
  const roots: LogEntry[] = []
  for (const e of entries) {
    // Una tirada encadenada cuelga de su padre; si el padre no está, se muestra suelta.
    if (e.parentId && kept.has(e.parentId)) {
      const list = children.get(e.parentId) ?? []
      list.push(e)
      children.set(e.parentId, list)
    } else roots.push(e)
  }

  const lines = [
    `# ${campaign.name}`,
    '',
    `_Exportado el ${formatDate(exportedAt)} · Turno ${campaign.turn}_`,
  ]

  const turns = [...new Set(roots.map((e) => e.turn))].sort((a, b) => a - b)
  if (turns.length === 0) lines.push('', '_El diario está vacío._')

  const walk = (e: LogEntry, depth: number): string[] => [
    ...entryLines(e, depth),
    ...(children.get(e.id) ?? []).flatMap((c) => walk(c, depth + 1)),
  ]

  for (const turn of turns) {
    lines.push('', turn === CREATION_TURN ? '## Creación de la campaña' : `## Turno ${turn}`)
    const inTurn = roots.filter((e) => e.turn === turn)
    for (const section of sectionOrder) {
      const items = inTurn.filter((e) => sectionOf(e) === section)
      if (items.length === 0) continue
      // En la creación todo es "Creación": sin subtítulo redundante.
      if (!(turn === CREATION_TURN && section === PHASE_LABELS.creation)) lines.push('', `### ${section}`)
      lines.push('', ...items.flatMap((e) => walk(e, 0)))
    }
  }
  return lines.join('\n') + '\n'
}

/** "diario-nova-rest-2026-11-27.md" */
export function markdownFileName(campaign: Campaign, exportedAt: Date): string {
  const slug =
    campaign.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'campana'
  const pad = (n: number) => String(n).padStart(2, '0')
  const date = `${exportedAt.getFullYear()}-${pad(exportedAt.getMonth() + 1)}-${pad(exportedAt.getDate())}`
  return `diario-${slug}-${date}.md`
}
