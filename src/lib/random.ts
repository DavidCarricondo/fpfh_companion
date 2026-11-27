import type { Rng } from '../engine/dice'

/** Generador criptográfico para "Tirar por mí" (F1.15). Fuera del motor a propósito. */
export const cryptoRng: Rng = () => {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0]! / 2 ** 32
}
