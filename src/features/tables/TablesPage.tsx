/**
 * Biblioteca de tablas (F1.17): buscador y uso libre fuera del flujo, con opción de anotar en una campaña.
 */
import * as Dialog from '@radix-ui/react-dialog'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { getTable, tables } from '../../content'
import { formatDice } from '../../engine/dice'
import { searchTables } from '../../engine/search'
import type { TableGroup } from '../../engine/types'
import { GROUP_LABELS } from '../labels'
import { formatPages } from '../../components/format'
import { TABLET_UP, useMediaQuery } from '../../components/useMediaQuery'
import { useAppStore } from '../../store/campaign'
import { TablePanel } from './TablePanel'

export function TablesPage() {
  const [params, setParams] = useSearchParams()
  const selectedId = params.get('t') ?? undefined
  const selected = selectedId ? getTable(selectedId) : undefined
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<TableGroup | 'all'>('all')
  const [campaignId, setCampaignId] = useState('')
  const campaigns = useAppStore((s) => s.campaigns)
  const campaign = campaigns[campaignId]
  const isTablet = useMediaQuery(TABLET_UP)

  const results = searchTables(tables, query).filter((t) => group === 'all' || t.group === group)
  const select = (id: string | undefined) => setParams(id ? { t: id } : {}, { replace: true })

  const panel = selected ? (
    <TablePanel
      key={selected.id}
      tableId={selected.id}
      {...(campaign ? { context: { campaignId: campaign.id, turn: campaign.turn } } : {})}
    />
  ) : (
    <p className="text-slate-400">Elige una tabla de la lista.</p>
  )

  return (
    <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[2fr_3fr]">
      <div className="flex min-h-0 flex-col gap-3">
        <h1 className="text-2xl font-semibold">Tablas</h1>
        <input
          type="search"
          aria-label="Buscar tabla"
          placeholder="Buscar por nombre, alias o página…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="field w-full"
        />
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Grupo">
          {(['all', ...Object.keys(GROUP_LABELS)] as (TableGroup | 'all')[]).map((g) => (
            <button
              key={g}
              type="button"
              role="radio"
              aria-checked={group === g}
              onClick={() => setGroup(g)}
              className={`chip ${group === g ? 'border-sky-500 bg-sky-900/60 text-sky-100' : 'border-slate-700 text-slate-300'}`}
            >
              {g === 'all' ? 'Todas' : GROUP_LABELS[g]}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-400">
          Anotar en
          <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className="field flex-1">
            <option value="">— ninguna (solo consultar) —</option>
            {Object.values(campaigns).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} (turno {c.turn})
              </option>
            ))}
          </select>
        </label>
        <ul className="min-h-0 divide-y divide-slate-800 rounded-lg border border-slate-800 md:overflow-y-auto">
          {results.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => select(t.id)}
                aria-current={t.id === selectedId ? 'true' : undefined}
                className={`flex min-h-11 w-full items-center gap-3 px-4 py-2 text-left ${
                  t.id === selectedId ? 'bg-slate-800' : 'hover:bg-slate-900'
                }`}
              >
                <span className="flex-1">{t.name}</span>
                <span className="text-sm text-slate-400">{t.dice ? formatDice(t.dice) : 'referencia'}</span>
                <span className="w-20 text-right text-sm text-slate-500">{formatPages(t.page)}</span>
              </button>
            </li>
          ))}
          {results.length === 0 && <li className="px-4 py-3 text-slate-400">Sin resultados.</li>}
        </ul>
      </div>

      {isTablet ? (
        <div
          className="min-h-0 overflow-y-auto rounded-xl border border-slate-800 p-4"
          aria-label="Panel de tabla"
        >
          {panel}
        </div>
      ) : (
        <Dialog.Root open={!!selected} onOpenChange={(o) => !o && select(undefined)}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60" />
            <Dialog.Content
              aria-describedby={undefined}
              className="fixed inset-x-0 bottom-0 z-40 max-h-[92dvh] overflow-y-auto rounded-t-2xl border-t border-slate-700 bg-slate-950 p-4"
            >
              <div className="mb-2 flex justify-between">
                <Dialog.Title className="text-sm text-slate-400">{selected?.name}</Dialog.Title>
                <Dialog.Close className="btn-ghost" aria-label="Cerrar">
                  ✕
                </Dialog.Close>
              </div>
              {panel}
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </div>
  )
}
