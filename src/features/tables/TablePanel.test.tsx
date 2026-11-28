import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getTable } from '../../content'
import type { StepDef } from '../../engine/types'
import { ToastHost } from '../../components/ToastHost'
import { progressKey, resetAppStore, useAppStore } from '../../store/campaign'
import { useUiStore } from '../../store/ui'
import { TablePanel } from './TablePanel'

const st = () => useAppStore.getState()
const typeDice = async (user: ReturnType<typeof userEvent.setup>, label: string, value: string) => {
  const input = screen.getByLabelText(label)
  await user.clear(input)
  await user.type(input, value)
}

let campaignId: string
beforeEach(() => {
  resetAppStore()
  useUiStore.setState({ toast: null })
  campaignId = st().createCampaign({
    name: 'Test',
    settings: { crewSize: 6, difficulty: 'normal', storyTrack: false, battleEvents: false },
  })
})

describe('TablePanel', () => {
  it('sin campaña: muestra el resultado pero no se puede confirmar', async () => {
    const user = userEvent.setup()
    render(<TablePanel tableId="injury" />)
    expect(screen.getByRole('heading', { name: 'Injury Table' })).toBeInTheDocument()
    await typeDice(user, 'Resultado D100', '48')
    const card = screen.getByRole('article', { name: 'Resultado' })
    expect(within(card).getByRole('heading', { name: 'Serious injury' })).toBeInTheDocument()
    expect(within(card).getByText('46–54')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Confirmar' })).not.toBeInTheDocument()
  })

  it('D100 = 1 y D100 = 00 (100) devuelven la primera y la última fila', async () => {
    const user = userEvent.setup()
    render(<TablePanel tableId="injury" />)
    await typeDice(user, 'Resultado D100', '1')
    expect(screen.getByRole('heading', { name: 'Gruesome fate' })).toBeInTheDocument()
    await typeDice(user, 'Resultado D100', '00')
    expect(screen.getByRole('heading', { name: 'School of hard knocks' })).toBeInTheDocument()
  })

  it('modificador: desglose y límite de la tabla', async () => {
    const user = userEvent.setup()
    render(<TablePanel tableId="injury" />)
    await typeDice(user, 'Resultado D100', '99')
    await user.click(screen.getByRole('button', { name: 'Sumar 1 al modificador' }))
    await user.click(screen.getByRole('button', { name: 'Sumar 1 al modificador' }))
    await user.type(screen.getByLabelText('Motivo del modificador'), 'Test')
    expect(screen.getByText('99 + 2 (Test) = 101 → 100 (límite de la tabla)')).toBeInTheDocument()
  })

  it('Loot → Weapon Category → Slug Weapons, confirmado y agrupado en el diario', async () => {
    const user = userEvent.setup()
    const step: StepDef = {
      id: 'post.loot',
      phase: 'post-battle',
      section: 'Post',
      title: 'Botín',
      body: '',
      page: 121,
      tables: ['loot'],
    }
    render(<TablePanel tableId="loot" context={{ campaignId, turn: 1, phase: 'post-battle', step }} />)

    await typeDice(user, 'Resultado D100', '10')
    expect(screen.getByRole('button', { name: /Siguiente: Roll Weapon Category/ })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(st().progress[progressKey(campaignId, 1)]!.checked['post.loot']).toEqual([true])

    await user.click(screen.getByRole('button', { name: /Siguiente: Roll Weapon Category/ }))
    expect(screen.getByRole('heading', { name: getTable('loot-weapon-category')!.name })).toBeInTheDocument()
    await typeDice(user, 'Resultado D100', '20')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    await user.click(screen.getByRole('button', { name: /Siguiente: Roll Slug Weapons/ }))
    await typeDice(user, 'Resultado D100', '7')
    expect(screen.getByRole('heading', { name: 'Hand Gun' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    const rolls = st().log.filter((e) => e.kind === 'roll')
    expect(rolls.map((e) => e.roll!.tableId)).toEqual(['loot', 'loot-weapon-category', 'loot-slug-weapons'])
    expect(rolls[1]!.parentId).toBe(rolls[0]!.id)
    expect(rolls[2]!.parentId).toBe(rolls[1]!.id)
    // Solo la tirada raíz marca el paso.
    expect(rolls[1]!.checkedSlot).toBeUndefined()

    await user.click(screen.getByRole('button', { name: /Volver a Loot Table/ }))
    expect(screen.getByRole('heading', { name: 'Loot Table' })).toBeInTheDocument()
  })

  it('"roll twice" deja la segunda tirada pendiente', async () => {
    const user = userEvent.setup()
    render(<TablePanel tableId="loot" context={{ campaignId, turn: 1 }} />)
    await typeDice(user, 'Resultado D100', '30') // Damaged weapons: 2 tiradas
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    await user.click(screen.getByRole('button', { name: /\(1\/2\)/ }))
    expect(screen.getByRole('button', { name: /Pendiente: Roll Weapon Category/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Pendiente/ }))
    expect(screen.queryByRole('button', { name: /Pendiente/ })).not.toBeInTheDocument()
  })

  it('Tirar por mí usa el generador inyectado y queda como "auto"; Deshacer desde el aviso', async () => {
    const user = userEvent.setup()
    render(
      <>
        <TablePanel tableId="injury" context={{ campaignId, turn: 1 }} rng={() => 0.475} />
        <ToastHost />
      </>,
    )
    await user.click(screen.getByRole('button', { name: /Tirar por mí/ }))
    expect(screen.getByLabelText('Resultado D100')).toHaveValue('48')
    await user.type(screen.getByLabelText('Nota (opcional)'), 'Simon')
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))
    const entry = st().log.at(-1)!
    expect(entry).toMatchObject({ note: 'Simon', roll: { source: 'auto', total: 48 } })
    expect(screen.getByRole('button', { name: '✓ Anotado en el diario' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Deshacer' }))
    expect(st().log.at(-1)!.undone).toBe(true)
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeEnabled()
  })

  it('el aviso desaparece a los 8 s', () => {
    render(<ToastHost />)
    vi.useFakeTimers()
    act(() => useUiStore.getState().showToast({ text: 'Hola' }))
    expect(screen.getByText('Hola')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(8000))
    expect(screen.queryByText('Hola')).not.toBeInTheDocument()
    vi.useRealTimers()
  })

  it('tabla multicolumna: columna sugerida y cambio de columna', async () => {
    const user = userEvent.setup()
    render(<TablePanel tableId="deployment-conditions" suggestColumn={() => 'rival'} />)
    expect(screen.getByRole('radio', { name: 'Rival' })).toHaveAttribute('aria-checked', 'true')
    await typeDice(user, 'Resultado D100', '12')
    expect(screen.getByRole('heading', { name: 'Small encounter' })).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Opportunity / Patron' }))
    expect(screen.getByRole('heading', { name: 'No Condition' })).toBeInTheDocument()
  })

  it('tabla de referencia: se muestra entera, sin dado', () => {
    render(<TablePanel tableId="ability-increase" />)
    expect(screen.queryByLabelText(/Resultado/)).not.toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('Ver tabla entera resalta la fila', async () => {
    const user = userEvent.setup()
    render(<TablePanel tableId="injury" />)
    await typeDice(user, 'Resultado D100', '16')
    await user.click(screen.getByRole('button', { name: /Ver tabla entera/ }))
    const row = screen.getByRole('row', { current: true })
    expect(row).toHaveTextContent('Miraculous escape')
  })
})
