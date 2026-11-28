/**
 * Entrada del dado con teclado numérico propio (spec §7, F1.10). El campo usa inputMode="none"
 * para no abrir el teclado del sistema en la tablet, pero admite el teclado físico en el portátil.
 */
import { useRef, useState } from 'react'
import { diceRange, formatDice, normalizeDice, type DiceSpec } from '../engine/dice'
import { canSwitchMode, isPercentile, maxDigits, readDraft, type DiceDraft } from './diceDraft'

interface Props {
  spec: DiceSpec
  value: DiceDraft
  onChange(draft: DiceDraft): void
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const

export function DiceInput({ spec, value, onChange }: Props) {
  const d = normalizeDice(spec)
  const [active, setActive] = useState(0)
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const digits = maxDigits(spec, value.mode)
  const result = readDraft(spec, value)
  const label = formatDice(spec)

  const fieldValue = (i: number) => (value.mode === 'total' ? value.total : (value.faces[i] ?? ''))

  const setField = (i: number, s: string) => {
    const clean = s.replace(/\D/g, '').slice(0, digits)
    if (value.mode === 'total') onChange({ ...value, total: clean })
    else onChange({ ...value, faces: value.faces.map((f, j) => (j === i ? clean : f)) })
    // Dado a dado con dados de una cifra: pasar solo al siguiente.
    if (value.mode === 'dice' && clean.length >= digits && i < d.dice - 1) focus(i + 1)
  }

  const focus = (i: number) => {
    setActive(i)
    refs.current[i]?.focus()
  }

  const press = (k: string) => {
    const i = value.mode === 'total' ? 0 : active
    const next = fieldValue(i) + k
    // Si la cifra nueva no cabe en el dado, empieza de cero (más rápido que borrar).
    setField(i, fits(next) ? next : k)
  }

  const fits = (s: string) => {
    if (s.length > digits) return false
    if ((value.mode === 'total' ? isPercentile(spec) : d.sides === 100) && /^0{1,2}$/.test(s)) return true
    return Number(s) <= (value.mode === 'total' ? diceRange(spec).max : d.sides)
  }

  const backspace = () => {
    const i = value.mode === 'total' ? 0 : active
    const cur = fieldValue(i)
    if (!cur && value.mode === 'dice' && i > 0) {
      focus(i - 1)
      return
    }
    setField(i, cur.slice(0, -1))
  }

  const clear = () => {
    onChange({ ...value, total: '', faces: value.faces.map(() => '') })
    setActive(0)
  }

  const switchMode = () => {
    onChange({ ...value, mode: value.mode === 'total' ? 'dice' : 'total' })
    setActive(0)
  }

  const fields = value.mode === 'total' ? [0] : value.faces.map((_, i) => i)
  const invalid = result.kind === 'error'

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {fields.map((i) => (
          <input
            key={`${value.mode}-${i}`}
            ref={(el) => {
              refs.current[i] = el
            }}
            aria-label={value.mode === 'total' ? `Resultado ${label}` : `Dado ${i + 1} de ${d.dice}`}
            aria-invalid={invalid}
            inputMode="none"
            autoComplete="off"
            value={fieldValue(i)}
            placeholder={value.mode === 'total' ? label : `D${d.sides}`}
            onFocus={() => setActive(i)}
            onChange={(e) => setField(i, e.target.value)}
            className={`h-14 rounded-lg border bg-slate-900 text-center font-mono text-3xl tabular-nums outline-none focus:ring-2 focus:ring-sky-500 ${
              value.mode === 'total' ? 'w-32' : 'w-20'
            } ${invalid ? 'border-red-500' : 'border-slate-700'} ${
              value.mode === 'dice' && active === i ? 'ring-2 ring-sky-700' : ''
            }`}
          />
        ))}
        {canSwitchMode(spec) && (
          <button type="button" onClick={switchMode} className="btn-ghost text-sm">
            {value.mode === 'total' ? 'Dado a dado' : 'Total'}
          </button>
        )}
      </div>
      <p className={`min-h-5 text-sm ${invalid ? 'text-red-400' : 'text-slate-400'}`} role="status">
        {invalid
          ? result.message
          : value.mode === 'dice' && d.keep
            ? `Introduce los ${d.dice} dados: se queda el ${d.keep === 'highest' ? 'más alto' : 'más bajo'}.`
            : isPercentile(spec)
              ? '00 = 100'
              : ''}
      </p>
      <div className="grid max-w-xs grid-cols-3 gap-2" aria-label="Teclado numérico">
        {KEYS.map((k) => (
          <button key={k} type="button" className="key" onClick={() => press(k)}>
            {k}
          </button>
        ))}
        <button type="button" className="key text-base" onClick={clear} aria-label="Borrar todo">
          C
        </button>
        <button type="button" className="key" onClick={() => press('0')}>
          0
        </button>
        <button type="button" className="key" onClick={backspace} aria-label="Borrar">
          ⌫
        </button>
      </div>
    </div>
  )
}
