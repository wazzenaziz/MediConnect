import { useEffect, useRef, useState } from 'react'
import { useNotifications } from '../context/NotificationContext'

const TONE_DOT = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  info: 'bg-sky-500',
  error: 'bg-rose-500',
}

function timeAgo(iso) {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  const s = Math.max(0, Math.floor(ms / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export default function NotificationBell() {
  const { notifications, unreadCount, markAllRead, remove, clear } =
    useNotifications()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function toggle() {
    const next = !open
    setOpen(next)
    // Opening the panel marks everything as read.
    if (next && unreadCount > 0) markAllRead()
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          // Dropdown anchors to the bell's right edge and caps its width
          // so it never overflows a small viewport. The viewport-aware
          // `max-w-[calc(100vw-2rem)]` is the safety net.
          className="absolute right-0 z-40 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            {notifications.length > 0 && (
              <button
                onClick={clear}
                className="text-xs font-medium text-slate-500 hover:text-slate-700"
              >
                Clear all
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              You’re all caught up.
            </div>
          ) : (
            <ul className="max-h-[60vh] divide-y divide-slate-100 overflow-y-auto">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={`group flex items-start gap-3 px-4 py-3 ${
                    n.read ? 'bg-white' : 'bg-sky-50/40'
                  }`}
                >
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      TONE_DOT[n.tone] || TONE_DOT.info
                    }`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                        {n.body}
                      </p>
                    )}
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">
                      {timeAgo(n.created_at)}
                    </p>
                  </div>
                  <button
                    onClick={() => remove(n.id)}
                    className="opacity-0 transition group-hover:opacity-100"
                    aria-label="Remove notification"
                    title="Remove"
                  >
                    <span className="text-xs text-slate-400 hover:text-slate-700">
                      ✕
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
