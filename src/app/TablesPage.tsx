import { tables } from '../content'
import { formatDice } from '../engine/dice'

/** Listado provisional de tablas (la biblioteca completa con buscador es M3, F1.17). */
export function TablesPage() {
  return (
    <section className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">Tablas</h1>
      <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800">
        {tables.map((t) => (
          <li key={t.id} className="flex items-center gap-3 px-4 py-3">
            <span className="flex-1">{t.name}</span>
            <span className="text-sm text-slate-400">{t.dice ? formatDice(t.dice) : 'referencia'}</span>
            <span className="text-sm text-slate-400">
              p. {Array.isArray(t.page) ? t.page.join(', ') : t.page}
            </span>
            {!t.verified && (
              <span
                className="rounded bg-amber-900/60 px-2 py-0.5 text-xs text-amber-200"
                title="Sin revisar contra el libro"
              >
                sin verificar
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
