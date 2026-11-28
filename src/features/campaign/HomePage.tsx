/**
 * Inicio: lista de campañas, crear, renombrar y borrar (F1.1, F1.2). Importar copia llega en M4.
 */
import * as Dialog from '@radix-ui/react-dialog'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAppStore } from '../../store/campaign'
import type { Campaign, CampaignSettings, CrewSize, Difficulty } from '../../store/types'

const DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: 'easy', label: 'Easy' },
  { id: 'normal', label: 'Normal' },
  { id: 'challenging', label: 'Challenging' },
  { id: 'hardcore', label: 'Hardcore' },
  { id: 'insanity', label: 'Insanity' },
]

export function HomePage() {
  const campaigns = useAppStore((s) => s.campaigns)
  const list = Object.values(campaigns).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  return (
    <section className="mx-auto w-full max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Campañas</h1>
        <NewCampaignDialog />
      </div>
      <p className="rounded-lg border border-amber-900 bg-amber-950/40 px-3 py-2 text-sm text-amber-200">
        Versión en memoria: las campañas se pierden al recargar. El guardado llega en M4.
      </p>
      {list.length === 0 ? (
        <p className="text-slate-400">Aún no hay campañas.</p>
      ) : (
        <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800">
          {list.map((c) => (
            <CampaignRow key={c.id} campaign={c} />
          ))}
        </ul>
      )}
    </section>
  )
}

function CampaignRow({ campaign: c }: { campaign: Campaign }) {
  return (
    <li className="flex flex-wrap items-center gap-2 px-4 py-3">
      <div className="mr-auto">
        <p className="font-medium">{c.name}</p>
        <p className="text-sm text-slate-400">
          Turno {c.turn} · {c.settings.crewSize} tripulantes ·{' '}
          {DIFFICULTIES.find((d) => d.id === c.settings.difficulty)?.label}
        </p>
      </div>
      <Link to={`/c/${c.id}/create`} className="btn-ghost">
        Creación
      </Link>
      <Link to={`/c/${c.id}/turn`} className="btn-primary">
        Turno
      </Link>
      <RenameDialog campaign={c} />
      <DeleteDialog campaign={c} />
    </li>
  )
}

function ModalFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60" />
      <Dialog.Content
        aria-describedby={undefined}
        className="fixed top-1/2 left-1/2 z-50 max-h-[90dvh] w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 space-y-4 overflow-y-auto rounded-xl border border-slate-700 bg-slate-950 p-5"
      >
        <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  )
}

function NewCampaignDialog() {
  const createCampaign = useAppStore((s) => s.createCampaign)
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [crewSize, setCrewSize] = useState<CrewSize>(6)
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [storyTrack, setStoryTrack] = useState(false)
  const [battleEvents, setBattleEvents] = useState(false)
  const [victory, setVictory] = useState('')
  const [houseRules, setHouseRules] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const settings: CampaignSettings = {
      crewSize,
      difficulty,
      storyTrack,
      battleEvents,
      ...(victory.trim() ? { victory: victory.trim() } : {}),
      ...(houseRules.trim() ? { houseRules: houseRules.trim() } : {}),
    }
    const id = createCampaign({ name, settings })
    setOpen(false)
    navigate(`/c/${id}/create`)
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="btn-primary">Nueva campaña</Dialog.Trigger>
      <ModalFrame title="Nueva campaña">
        <form onSubmit={submit} className="space-y-4">
          <label className="block space-y-1">
            <span className="text-sm text-slate-400">Nombre</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="field w-full"
            />
          </label>
          <fieldset className="space-y-1">
            <legend className="text-sm text-slate-400">Tamaño de tripulación</legend>
            <div className="flex gap-2">
              {([6, 5, 4] as const).map((n) => (
                <label key={n} className="chip cursor-pointer gap-2 border-slate-700">
                  <input
                    type="radio"
                    name="crewSize"
                    checked={crewSize === n}
                    onChange={() => setCrewSize(n)}
                    className="accent-sky-500"
                  />
                  {n}
                  {n === 6 ? ' (estándar)' : ''}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block space-y-1">
            <span className="text-sm text-slate-400">Dificultad</span>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              className="field w-full"
            >
              {DIFFICULTIES.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              checked={storyTrack}
              onChange={(e) => setStoryTrack(e.target.checked)}
              className="size-5 accent-sky-500"
            />
            Usar el Story Track
          </label>
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              checked={battleEvents}
              onChange={(e) => setBattleEvents(e.target.checked)}
              className="size-5 accent-sky-500"
            />
            Usar Battle Events
          </label>
          <label className="block space-y-1">
            <span className="text-sm text-slate-400">Condición de victoria (opcional)</span>
            <input value={victory} onChange={(e) => setVictory(e.target.value)} className="field w-full" />
          </label>
          <label className="block space-y-1">
            <span className="text-sm text-slate-400">Reglas caseras (opcional)</span>
            <textarea
              value={houseRules}
              onChange={(e) => setHouseRules(e.target.value)}
              rows={2}
              className="field w-full py-2"
            />
          </label>
          <div className="flex justify-end gap-2">
            <Dialog.Close className="btn-ghost">Cancelar</Dialog.Close>
            <button type="submit" className="btn-primary" disabled={!name.trim()}>
              Crear
            </button>
          </div>
        </form>
      </ModalFrame>
    </Dialog.Root>
  )
}

function RenameDialog({ campaign }: { campaign: Campaign }) {
  const renameCampaign = useAppStore((s) => s.renameCampaign)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(campaign.name)
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) setName(campaign.name)
      }}
    >
      <Dialog.Trigger className="btn-ghost">Renombrar</Dialog.Trigger>
      <ModalFrame title="Renombrar campaña">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            renameCampaign(campaign.id, name)
            setOpen(false)
          }}
        >
          <input
            aria-label="Nombre"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="field w-full"
          />
          <div className="flex justify-end gap-2">
            <Dialog.Close className="btn-ghost">Cancelar</Dialog.Close>
            <button type="submit" className="btn-primary" disabled={!name.trim()}>
              Guardar
            </button>
          </div>
        </form>
      </ModalFrame>
    </Dialog.Root>
  )
}

function DeleteDialog({ campaign }: { campaign: Campaign }) {
  const deleteCampaign = useAppStore((s) => s.deleteCampaign)
  const [confirm, setConfirm] = useState('')
  return (
    <Dialog.Root onOpenChange={() => setConfirm('')}>
      <Dialog.Trigger className="btn-ghost text-red-300">Borrar</Dialog.Trigger>
      <ModalFrame title="Borrar campaña">
        <p className="text-slate-300">
          Se borrarán la campaña, su progreso y su diario. Escribe <strong>{campaign.name}</strong> para
          confirmar.
        </p>
        <input
          aria-label="Nombre de la campaña"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="field w-full"
        />
        <div className="flex justify-end gap-2">
          <Dialog.Close className="btn-ghost">Cancelar</Dialog.Close>
          <button
            type="button"
            className="btn-danger"
            disabled={confirm !== campaign.name}
            onClick={() => deleteCampaign(campaign.id)}
          >
            Borrar
          </button>
        </div>
      </ModalFrame>
    </Dialog.Root>
  )
}
