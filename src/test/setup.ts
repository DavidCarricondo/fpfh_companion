import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Sin `globals: true`, Testing Library no desmonta solo entre tests.
afterEach(() => cleanup())

// jsdom no trae ResizeObserver y Radix (Popover) lo usa para posicionar.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}
