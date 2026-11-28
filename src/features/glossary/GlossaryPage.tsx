/**
 * Glosario (F1.21): término en inglés, explicación en español y página.
 */
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { glossary } from '../../content'
import { searchGlossary } from '../../engine/search'
import { formatPages } from '../../components/format'

const sorted = [...glossary].sort((a, b) => a.term.localeCompare(b.term))

export function GlossaryPage() {
  const [query, setQuery] = useState('')
  const { hash } = useLocation()
  const target = hash.replace(/^#/, '')
  const results = searchGlossary(sorted, query)

  useEffect(() => {
    if (target) document.getElementById(`term-${target}`)?.scrollIntoView?.({ block: 'center' })
  }, [target])

  return (
    <section className="mx-auto w-full max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">Glosario</h1>
      <input
        type="search"
        aria-label="Buscar término"
        placeholder="Buscar término…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="field w-full"
      />
      <dl className="divide-y divide-slate-800 rounded-lg border border-slate-800">
        {results.map((t) => (
          <div
            key={t.id}
            id={`term-${t.id}`}
            className={`space-y-1 px-4 py-3 ${t.id === target ? 'bg-sky-950/50' : ''}`}
          >
            <dt className="font-semibold">
              {t.term}
              {t.aliases?.length ? (
                <span className="ml-2 text-sm font-normal text-slate-400">({t.aliases.join(', ')})</span>
              ) : null}
              <span className="ml-2 text-sm font-normal text-slate-500">{formatPages(t.page)}</span>
            </dt>
            <dd className="text-slate-300">{t.explanation}</dd>
          </div>
        ))}
        {results.length === 0 && <p className="px-4 py-3 text-slate-400">Sin resultados.</p>}
      </dl>
    </section>
  )
}
