/** "p. 76" · "p. 70–71" · "p. 23, 94" */
export function formatPages(page: number | number[]): string {
  if (!Array.isArray(page)) return `p. ${page}`
  if (page.length === 2 && page[1]! - page[0]! === 1) return `p. ${page[0]}–${page[1]}`
  return `p. ${page.join(', ')}`
}

/** "41–45" o "7" */
export function formatRange(range: [number, number]): string {
  return range[0] === range[1] ? String(range[0]) : `${range[0]}–${range[1]}`
}
