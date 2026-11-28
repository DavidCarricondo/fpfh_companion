import { getTable } from '../../content'
import type { NextRoll } from '../../engine/types'

/** Texto del botón de encadenado: el `label` del contenido o "Tirar en {tabla}". */
export function nextLabel(n: NextRoll): string {
  return n.label ?? `Tirar en ${getTable(n.tableId)?.name ?? n.tableId}`
}
