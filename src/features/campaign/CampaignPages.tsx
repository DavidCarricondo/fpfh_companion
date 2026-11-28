/**
 * Pantallas de una campaña: Creación (#/c/:id/create), Turno (#/c/:id/turn) y Diario (#/c/:id/log).
 */
import * as Tabs from '@radix-ui/react-tabs'
import { useState, type ReactNode } from 'react'
import { Link, NavLink, useParams } from 'react-router'
import { useAppStore } from '../../store/campaign'
import { CREATION_TURN, type Campaign } from '../../store/types'
import { ChecklistView } from '../checklist/ChecklistView'
import { useProgress } from '../checklist/useTurnFlags'
import { TURN_TABS, type TurnTab } from '../labels'
import { LogList } from '../log/LogList'
import { logToMarkdown, markdownFileName } from '../log/markdown'
import { downloadText } from '../../lib/download'

const sub = ({ isActive }: { isActive: boolean }) =>
  `inline-flex min-h-11 items-center rounded-md px-3 text-sm ${
    isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-900'
  }`

function CampaignShell({ children }: { children: (c: Campaign) => ReactNode }) {
  const { id = '' } = useParams()
  const campaign = useAppStore((s) => s.campaigns[id])
  if (!campaign) {
    return (
      <section className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-2xl font-semibold">Campaña no encontrada</h1>
        <p className="text-slate-400">
          Hasta M4 las campañas viven solo en memoria: al recargar la página se pierden.
        </p>
        <Link to="/" className="text-sky-400 underline">
          Volver al inicio
        </Link>
      </section>
    )
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <h1 className="text-xl font-semibold">{campaign.name}</h1>
        <nav className="flex gap-1" aria-label="Secciones de la campaña">
          <NavLink to={`/c/${campaign.id}/create`} className={sub}>
            Creación
          </NavLink>
          <NavLink to={`/c/${campaign.id}/turn`} className={sub}>
            Turno {campaign.turn}
          </NavLink>
          <NavLink to={`/c/${campaign.id}/log`} className={sub}>
            Diario
          </NavLink>
        </nav>
      </div>
      {children(campaign)}
    </div>
  )
}

export function CreationPage() {
  return (
    <CampaignShell>
      {(c) => <ChecklistView key={c.id} campaign={c} turn={CREATION_TURN} phases={['creation']} />}
    </CampaignShell>
  )
}

function TabLabel({ campaign, tab }: { campaign: Campaign; tab: TurnTab }) {
  const { done, total } = useProgress(campaign, campaign.turn, tab.phases)
  return (
    <>
      {tab.label}
      <span className="ml-2 text-xs text-slate-400">
        {done}/{total}
      </span>
    </>
  )
}

export function TurnPage() {
  const [tab, setTab] = useState('travel')
  return (
    <CampaignShell>
      {(c) => (
        <Tabs.Root value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col gap-3">
          <Tabs.List className="flex flex-wrap gap-1 border-b border-slate-800" aria-label="Fases del turno">
            {TURN_TABS.map((t) => (
              <Tabs.Trigger
                key={t.id}
                value={t.id}
                className="min-h-11 border-b-2 border-transparent px-4 font-medium text-slate-400 data-[state=active]:border-sky-500 data-[state=active]:text-white"
              >
                <TabLabel campaign={c} tab={t} />
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          {TURN_TABS.map((t) => (
            <Tabs.Content key={t.id} value={t.id} className="flex min-h-0 flex-1 flex-col">
              <ChecklistView
                campaign={c}
                turn={c.turn}
                phases={t.phases}
                {...(t.extraFlags ? { extraFlags: t.extraFlags } : {})}
              />
            </Tabs.Content>
          ))}
        </Tabs.Root>
      )}
    </CampaignShell>
  )
}

export function LogPage() {
  return <CampaignShell>{(c) => <LogView campaign={c} />}</CampaignShell>
}

function LogView({ campaign }: { campaign: Campaign }) {
  const addNote = useAppStore((s) => s.addNote)
  const [text, setText] = useState('')
  const exportMarkdown = () => {
    const now = new Date()
    downloadText(markdownFileName(campaign, now), logToMarkdown(campaign, useAppStore.getState().log, now))
  }
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <div className="flex justify-end">
        <button type="button" className="btn-secondary" onClick={exportMarkdown}>
          Exportar Markdown
        </button>
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!text.trim()) return
          addNote({ campaignId: campaign.id, turn: campaign.turn, text })
          setText('')
        }}
      >
        <input
          aria-label="Nueva nota"
          placeholder="Nota libre para el turno actual…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="field flex-1"
        />
        <button type="submit" className="btn-primary" disabled={!text.trim()}>
          Añadir nota
        </button>
      </form>
      <LogList campaignId={campaign.id} />
    </div>
  )
}
