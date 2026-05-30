import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'

/**
 * Promise-based confirm dialog.
 *
 *   const confirm = useConfirm()
 *   const ok = await confirm({
 *     title: 'Cancel this appointment?',
 *     description: 'This cannot be undone.',
 *     confirmLabel: 'Yes, cancel',
 *     cancelLabel: 'Keep it',
 *     tone: 'danger',
 *   })
 *   if (!ok) return
 *
 * Tone controls the confirm-button color: 'danger' (rose), 'warning'
 * (amber), or 'primary' (sky). Defaults to primary.
 */

const ConfirmContext = createContext(null)

const TONE_BUTTON = {
  danger: 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-300',
  warning: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-300',
  primary: 'bg-sky-600 hover:bg-sky-700 focus:ring-sky-300',
}

export function ConfirmProvider({ children }) {
  const [open, setOpen] = useState(false)
  const [opts, setOpts] = useState({})
  // Hold the resolver so we can settle the awaited promise from the
  // user's click (or close action).
  const resolverRef = useRef(null)

  const confirm = useCallback((options = {}) => {
    setOpts(options)
    setOpen(true)
    return new Promise((resolve) => {
      resolverRef.current = resolve
    })
  }, [])

  const settle = useCallback((result) => {
    setOpen(false)
    const r = resolverRef.current
    resolverRef.current = null
    if (r) r(result)
  }, [])

  // Escape closes (as cancel); Enter confirms when the dialog is open.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') settle(false)
      else if (e.key === 'Enter') settle(true)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, settle])

  const tone = TONE_BUTTON[opts.tone] || TONE_BUTTON.primary

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          // Click on the backdrop counts as cancel.
          onClick={(e) => {
            if (e.target === e.currentTarget) settle(false)
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2
              id="confirm-title"
              className="text-lg font-semibold text-slate-900"
            >
              {opts.title || 'Are you sure?'}
            </h2>
            {opts.description && (
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {opts.description}
              </p>
            )}
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => settle(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                {opts.cancelLabel || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => settle(true)}
                autoFocus
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 ${tone}`}
              >
                {opts.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx)
    throw new Error('useConfirm must be used inside <ConfirmProvider>')
  return ctx
}
