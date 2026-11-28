/**
 * Aviso con Deshacer durante 8 s (spec §7).
 */
import { useEffect } from 'react'
import { TOAST_MS, useUiStore } from '../store/ui'

export function ToastHost() {
  const toast = useUiStore((s) => s.toast)
  const dismiss = useUiStore((s) => s.dismissToast)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => dismiss(toast.id), TOAST_MS)
    return () => clearTimeout(t)
  }, [toast, dismiss])

  if (!toast) return null
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-lg items-center gap-3 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm shadow-xl"
    >
      <span className="flex-1">{toast.text}</span>
      {toast.action && (
        <button
          type="button"
          className="btn-ghost text-sky-300"
          onClick={() => {
            toast.action!.run()
            dismiss(toast.id)
          }}
        >
          {toast.action.label}
        </button>
      )}
      <button type="button" className="btn-ghost" aria-label="Cerrar aviso" onClick={() => dismiss(toast.id)}>
        ✕
      </button>
    </div>
  )
}
