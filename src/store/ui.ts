/**
 * Estado de interfaz: no es estado de campaña, así que no pasa por el diario.
 */
import { create } from 'zustand'

export interface Toast {
  id: number
  text: string
  action?: { label: string; run: () => void }
}

export interface UiState {
  toast: Toast | null
  /** Pasos no aplicables: ocultarlos o atenuarlos (F1.6). */
  inapplicable: 'dim' | 'hide'
  /** Paso activo por vista: clave `${campaignId}:${turn}:${tab}`. */
  activeStep: Record<string, string>
  /** Última tabla abierta por paso (§7 "Detalles para la mesa"). */
  lastTable: Record<string, string>
  showToast(t: Omit<Toast, 'id'>): void
  dismissToast(id?: number): void
  setInapplicable(v: UiState['inapplicable']): void
  setActiveStep(viewKey: string, stepId: string): void
  setLastTable(stepId: string, tableId: string): void
}

let toastSeq = 0

export const useUiStore = create<UiState>()((set) => ({
  toast: null,
  inapplicable: 'dim',
  activeStep: {},
  lastTable: {},
  showToast: (t) => set({ toast: { ...t, id: ++toastSeq } }),
  dismissToast: (id) => set((s) => (id === undefined || s.toast?.id === id ? { toast: null } : s)),
  setInapplicable: (inapplicable) => set({ inapplicable }),
  setActiveStep: (viewKey, stepId) => set((s) => ({ activeStep: { ...s.activeStep, [viewKey]: stepId } })),
  setLastTable: (stepId, tableId) => set((s) => ({ lastTable: { ...s.lastTable, [stepId]: tableId } })),
}))

export const TOAST_MS = 8000
