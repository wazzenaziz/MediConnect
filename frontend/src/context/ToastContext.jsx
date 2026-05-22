import { createContext, useCallback, useContext, useState } from 'react'

const ToastContext = createContext(null)

const TONE_CLASSES = {
  info: 'border-sky-200 bg-sky-50 text-sky-900',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  error: 'border-rose-200 bg-rose-50 text-rose-900',
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // toast({ title, body, tone, duration })
  const toast = useCallback(
    ({ title, body, tone = 'info', duration = 5000 }) => {
      const id = Math.random().toString(36).slice(2)
      setToasts((prev) => [...prev, { id, title, body, tone }])
      if (duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id))
        }, duration)
      }
      return id
    },
    [],
  )

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-4 z-50 mx-auto flex w-full max-w-sm flex-col gap-2 px-4"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto rounded-xl border px-4 py-3 shadow-lg ${
              TONE_CLASSES[t.tone] || TONE_CLASSES.info
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                {t.title && (
                  <p className="text-sm font-semibold">{t.title}</p>
                )}
                {t.body && (
                  <p className="mt-0.5 text-xs leading-relaxed">{t.body}</p>
                )}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="text-xs font-medium opacity-70 hover:opacity-100"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
