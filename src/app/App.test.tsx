import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetAppStore, useAppStore } from '../store/campaign'
import { useUiStore } from '../store/ui'
import { App } from './App'
import { routes } from './routes'

const renderAt = (path: string) => {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

beforeEach(() => {
  resetAppStore()
  useUiStore.setState({ toast: null, activeStep: {}, lastTable: {}, inapplicable: 'dim' })
})

describe('App', () => {
  it('muestra la pantalla de inicio', async () => {
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Campañas' })).toBeInTheDocument()
  })

  it('juega parte de un turno: crear campaña, flag, tabla, confirmar y diario', async () => {
    const user = userEvent.setup()
    const router = renderAt('/')
    await user.click(await screen.findByRole('button', { name: 'Nueva campaña' }))
    await user.type(screen.getByLabelText('Nombre'), 'Nova Rest')
    await user.click(screen.getByRole('button', { name: 'Crear' }))

    // Creación (Parte 1)
    expect(await screen.findByRole('heading', { name: 'Nova Rest' })).toBeInTheDocument()
    expect(router.state.location.pathname).toMatch(/\/create$/)
    expect(screen.getByText(/0 de \d+ pasos/)).toBeInTheDocument()

    // Turno → Viaje: sin viajar, el evento de viaje no aplica.
    await user.click(screen.getByRole('link', { name: 'Turno 1' }))
    const travelStep = await screen.findByRole('button', { name: /Tirar D100 en Starship Travel Events/ })
    expect(travelStep.closest('li')).toHaveClass('opacity-40')
    await user.click(screen.getByRole('switch', { name: '¿Viajas este turno?' }))
    expect(travelStep.closest('li')).not.toHaveClass('opacity-40')

    // Chip de la tabla → panel → dado → confirmar marca el paso.
    await user.click(
      within(travelStep.closest('li')!).getByRole('button', { name: 'Starship Travel Events Table' }),
    )
    const panel = screen.getByLabelText('Panel de tabla')
    await user.type(within(panel).getByLabelText('Resultado D100'), '50')
    await user.click(within(panel).getByRole('button', { name: 'Confirmar' }))
    expect(within(travelStep.closest('li')!).getByRole('checkbox')).toBeChecked()

    // El diario tiene la pregunta, la tirada y el paso; se puede deshacer.
    await user.click(screen.getByRole('link', { name: 'Diario' }))
    expect(await screen.findByText('¿Viajas este turno? → Sí')).toBeInTheDocument()
    expect(screen.getByText(/Starship Travel Events Table \(D100=50\)/)).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Deshacer' }).at(-1)!)
    const [, progress] = Object.entries(useAppStore.getState().progress).find(([k]) => k.endsWith(':1'))!
    expect(progress.checked['travel.event']).toEqual([false])
  })

  it('ocultar pasos no aplicables', async () => {
    const user = userEvent.setup()
    const id = useAppStore.getState().createCampaign({
      name: 'A',
      settings: { crewSize: 6, difficulty: 'normal', storyTrack: false, battleEvents: false },
    })
    renderAt(`/c/${id}/turn`)
    expect(
      await screen.findByRole('button', { name: /Tirar D100 en Starship Travel Events/ }),
    ).toBeInTheDocument()
    await user.click(screen.getByLabelText('Ocultar no aplicables'))
    expect(
      screen.queryByRole('button', { name: /Tirar D100 en Starship Travel Events/ }),
    ).not.toBeInTheDocument()
  })

  it('pasos repetibles: una casilla por tripulante', async () => {
    const user = userEvent.setup()
    const id = useAppStore.getState().createCampaign({
      name: 'A',
      settings: { crewSize: 4, difficulty: 'normal', storyTrack: false, battleEvents: false },
    })
    renderAt(`/c/${id}/create`)
    const group = await screen.findByRole('group', { name: /Casillas: .*Tipo/ })
    const boxes = within(group).getAllByRole('checkbox')
    expect(boxes).toHaveLength(4)
    await user.click(boxes[1]!)
    expect(boxes[1]).toHaveAttribute('aria-checked', 'true')
  })

  it('exportar el diario a Markdown descarga un .md', async () => {
    const user = userEvent.setup()
    const id = useAppStore.getState().createCampaign({
      name: 'Nova Rest',
      settings: { crewSize: 6, difficulty: 'normal', storyTrack: false, battleEvents: false },
    })
    useAppStore.getState().addNote({ campaignId: id, turn: 1, text: 'Hola' })
    let blob: Blob | undefined
    const createObjectURL = vi.fn((b: Blob) => {
      blob = b
      return 'blob:x'
    })
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() }))
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      expect(this.download).toMatch(/^diario-nova-rest-\d{4}-\d{2}-\d{2}\.md$/)
    })
    renderAt(`/c/${id}/log`)
    await user.click(await screen.findByRole('button', { name: 'Exportar Markdown' }))
    expect(click).toHaveBeenCalledOnce()
    const text = await blob!.text()
    expect(text).toMatch(/^# Nova Rest\n/)
    expect(text).toContain('## Turno 1')
    expect(text).toContain('- Hola')
    click.mockRestore()
    vi.unstubAllGlobals()
  })

  it('campaña inexistente', async () => {
    renderAt('/c/nope/turn')
    expect(await screen.findByRole('heading', { name: 'Campaña no encontrada' })).toBeInTheDocument()
  })

  it('biblioteca: buscar por página y abrir una tabla', async () => {
    const user = userEvent.setup()
    renderAt('/tables')
    await user.type(await screen.findByLabelText('Buscar tabla'), '122')
    const list = screen.getAllByRole('listitem').map((li) => li.textContent)
    expect(list.some((t) => t?.includes('Injury Table'))).toBe(true)
    await user.click(screen.getByRole('button', { name: /^Injury Table/ }))
    expect(screen.getByRole('heading', { name: 'Injury Table' })).toBeInTheDocument()
  })

  it('glosario: buscar y popover desde el texto de un paso', async () => {
    const user = userEvent.setup()
    renderAt('/glossary')
    await user.type(await screen.findByLabelText('Buscar término'), 'held the field')
    expect(screen.getByText('Held the Field', { selector: 'dt' })).toBeInTheDocument()
  })

  it('términos del glosario tocables en el texto de los pasos', async () => {
    const user = userEvent.setup()
    const id = useAppStore.getState().createCampaign({
      name: 'A',
      settings: { crewSize: 6, difficulty: 'normal', storyTrack: false, battleEvents: false },
    })
    renderAt(`/c/${id}/turn`)
    await user.click((await screen.findAllByRole('button', { name: 'Rivals' }))[0]!)
    expect(await screen.findByRole('link', { name: 'Ver en el glosario' })).toBeInTheDocument()
  })
})
