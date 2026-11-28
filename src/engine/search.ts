/**
 * Buscadores de la biblioteca de tablas (F1.17) y del glosario (F1.21).
 * Sin distinguir mayúsculas ni tildes.
 */
import type { GlossaryTerm, TableDef } from './types'

export function normalizeSearch(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

const pages = (p: number | number[]) => (Array.isArray(p) ? p : [p])

/**
 * Por nombre, alias, id o página. Un número busca la página (también dentro de un rango "70–71").
 */
export function searchTables(tables: readonly TableDef[], query: string): TableDef[] {
  const q = normalizeSearch(query.trim()).replace(/^p\.?\s*/, '')
  if (!q) return [...tables]
  if (/^\d+$/.test(q)) {
    const n = Number(q)
    return tables.filter((t) => {
      const ps = pages(t.page)
      return ps.includes(n) || (ps.length === 2 && n >= ps[0]! && n <= ps[1]!)
    })
  }
  return tables.filter((t) =>
    [t.name, t.id, ...(t.aliases ?? [])].some((n) => normalizeSearch(n).includes(q)),
  )
}

/** Primero coincidencias por término o alias, después por explicación. */
export function searchGlossary(terms: readonly GlossaryTerm[], query: string): GlossaryTerm[] {
  const q = normalizeSearch(query.trim())
  if (!q) return [...terms]
  const byName = terms.filter((t) =>
    [t.term, ...(t.aliases ?? [])].some((n) => normalizeSearch(n).includes(q)),
  )
  const byText = terms.filter((t) => !byName.includes(t) && normalizeSearch(t.explanation).includes(q))
  return [...byName, ...byText]
}
