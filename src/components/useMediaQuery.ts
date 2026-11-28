import { useSyncExternalStore } from 'react'

/** Sin matchMedia (tests en jsdom) se asume pantalla ancha. */
export function useMediaQuery(query: string, fallback = true): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window.matchMedia !== 'function') return () => {}
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => (typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : fallback),
    () => fallback,
  )
}

/** Tablet o mayor: dos columnas (spec §7). */
export const TABLET_UP = '(min-width: 768px)'
