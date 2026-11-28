import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import type { DiceSpec } from '../engine/dice'
import { DiceInput } from './DiceInput'
import { emptyDraft, type DiceDraft } from './diceDraft'

function Harness({ spec, onDraft }: { spec: DiceSpec; onDraft?: (d: DiceDraft) => void }) {
  const [draft, setDraft] = useState(() => emptyDraft(spec))
  return (
    <DiceInput
      spec={spec}
      value={draft}
      onChange={(d) => {
        setDraft(d)
        onDraft?.(d)
      }}
    />
  )
}

const key = (name: string) => screen.getByRole('button', { name })

describe('DiceInput', () => {
  it('D100 con el teclado propio: 0 0 → 00 = 100, una cifra que no cabe empieza de nuevo', async () => {
    const user = userEvent.setup()
    render(<Harness spec="D100" />)
    const input = screen.getByLabelText('Resultado D100')
    await user.click(key('0'))
    await user.click(key('0'))
    expect(input).toHaveValue('00')
    expect(screen.getByRole('status')).toHaveTextContent('00 = 100')
    await user.click(key('Borrar todo'))
    await user.click(key('4'))
    await user.click(key('2'))
    await user.click(key('7')) // 427 no existe en un D100 → "7"
    expect(input).toHaveValue('7')
    await user.click(key('Borrar'))
    expect(input).toHaveValue('')
  })

  it('2D6: rechaza valores imposibles tecleados con el teclado físico', async () => {
    const user = userEvent.setup()
    render(<Harness spec="2D6" />)
    const input = screen.getByLabelText('Resultado 2D6')
    await user.type(input, '1')
    expect(screen.getByRole('status')).toHaveTextContent('Imposible con 2D6 (2–12)')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    await user.type(input, '2')
    expect(input).toHaveValue('12')
    expect(input).toHaveAttribute('aria-invalid', 'false')
  })

  it('dado a dado: avanza solo al siguiente dado y el borrado retrocede', async () => {
    const user = userEvent.setup()
    render(<Harness spec="2D6" />)
    await user.click(key('Dado a dado'))
    await user.click(key('3'))
    await user.click(key('5'))
    expect(screen.getByLabelText('Dado 1 de 2')).toHaveValue('3')
    expect(screen.getByLabelText('Dado 2 de 2')).toHaveValue('5')
    await user.click(key('Borrar'))
    await user.click(key('Borrar'))
    await user.click(key('Borrar'))
    expect(screen.getByLabelText('Dado 1 de 2')).toHaveValue('')
    await user.click(key('Total'))
    expect(screen.getByLabelText('Resultado 2D6')).toBeInTheDocument()
  })

  it('keep highest: pide cada dado y lo explica', () => {
    render(<Harness spec={{ dice: 2, sides: 6, keep: 'highest' }} />)
    expect(screen.getByLabelText('Dado 1 de 2')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Total' })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('se queda el más alto')
  })
})
