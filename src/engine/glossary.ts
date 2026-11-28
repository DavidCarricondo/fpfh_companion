/**
 * Glosario: búsqueda de términos y troceado de textos con marcas [[Term]] (F1.21).
 */
import type { GlossaryTerm } from './types'

export type TextSegment = { text: string } | { term: string }

/** "Huye ([[Bail]])." → [{text:'Huye ('}, {term:'Bail'}, {text:').'}] */
export function splitGlossaryText(text: string): TextSegment[] {
  const out: TextSegment[] = []
  let last = 0
  for (const m of text.matchAll(/\[\[([^\]]+)\]\]/g)) {
    if (m.index > last) out.push({ text: text.slice(last, m.index) })
    out.push({ term: m[1]!.trim() })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push({ text: text.slice(last) })
  return out
}

/** Texto sin marcas, para buscar o mostrar en plano. */
export function plainGlossaryText(text: string): string {
  return text.replace(/\[\[([^\]]+)\]\]/g, '$1')
}

export function buildTermIndex(terms: readonly GlossaryTerm[]): Map<string, GlossaryTerm> {
  const index = new Map<string, GlossaryTerm>()
  for (const t of terms) {
    for (const name of [t.term, ...(t.aliases ?? [])]) index.set(name.toLowerCase(), t)
  }
  return index
}
