import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useAuth } from './AuthContext'
import { useSocket } from './SocketContext'

const STORAGE_PREFIX = 'mediconnect_notifications_'
const STORAGE_LIMIT = 100

const TZ = 'Africa/Tunis'

function storageKey(userId) {
  return `${STORAGE_PREFIX}${userId || 'anon'}`
}

function loadFromStorage(userId) {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveToStorage(userId, list) {
  try {
    localStorage.setItem(
      storageKey(userId),
      JSON.stringify(list.slice(0, STORAGE_LIMIT)),
    )
  } catch {
    // Quota or private mode — silently drop.
  }
}

function asUtcDate(iso) {
  if (!iso) return null
  const s = /Z$|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + 'Z'
  return new Date(s)
}

function formatWhen(iso) {
  const d = asUtcDate(iso)
  if (!d) return ''
  return d.toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  })
}

/**
 * Build a role-aware notification object from a raw socket payload.
 * Returns null if the event doesn't apply to this user's role (e.g. a
 * doctor receiving their own self-emit cancellation — we still record
 * it because the spec asks for full history).
 */
function buildNotification({ event, payload, role }) {
  const id =
    payload?.appointment?.id ||
    payload?.note?.id ||
    Math.random().toString(36).slice(2)
  const created_at = new Date().toISOString()

  switch (event) {
    case 'appointment:created': {
      const when = formatWhen(payload?.appointment?.start_time)
      if (role === 'doctor') {
        return {
          id: `created-${id}-${created_at}`,
          kind: 'appointment_created',
          tone: 'success',
          title: 'New appointment booked',
          body: `${payload?.patient?.full_name || 'A patient'} booked you for ${when}.`,
          created_at,
          read: false,
        }
      }
      return {
        id: `created-${id}-${created_at}`,
        kind: 'appointment_created',
        tone: 'success',
        title: 'Appointment booked',
        body: `Your visit is set for ${when}. Awaiting doctor confirmation.`,
        created_at,
        read: false,
      }
    }
    case 'appointment:cancelled': {
      const when = formatWhen(payload?.appointment?.start_time)
      const by = payload?.cancelled_by
      if (role === 'doctor') {
        return {
          id: `cancelled-${id}-${created_at}`,
          kind: 'appointment_cancelled',
          tone: 'warning',
          title: 'Appointment cancelled',
          body:
            by === 'patient'
              ? `Your patient cancelled the ${when} appointment.`
              : `The ${when} appointment was cancelled.`,
          created_at,
          read: false,
        }
      }
      return {
        id: `cancelled-${id}-${created_at}`,
        kind: 'appointment_cancelled',
        tone: 'warning',
        title: 'Appointment cancelled',
        body:
          by === 'doctor'
            ? `The doctor cancelled your ${when} appointment.`
            : `Your ${when} appointment was cancelled.`,
        created_at,
        read: false,
      }
    }
    case 'appointment:status-changed': {
      const when = formatWhen(payload?.appointment?.start_time)
      const newStatus = payload?.status
      if (newStatus === 'cancelled') return null // handled by the cancelled event
      const statusLabel =
        {
          pending: 'is now pending',
          confirmed: 'was confirmed',
          completed: 'was marked completed',
        }[newStatus] || `changed to ${newStatus}`
      return {
        id: `status-${id}-${newStatus}-${created_at}`,
        kind: 'appointment_status',
        tone: newStatus === 'completed' ? 'success' : 'info',
        title: 'Appointment status updated',
        body: `Your ${when} appointment ${statusLabel}.`,
        created_at,
        read: false,
      }
    }
    case 'note:created': {
      if (role === 'doctor') {
        return {
          id: `note-${id}-${created_at}`,
          kind: 'note_created',
          tone: 'success',
          title: 'Consultation note saved',
          body: 'Your note is now visible to the patient.',
          created_at,
          read: false,
        }
      }
      return {
        id: `note-${id}-${created_at}`,
        kind: 'note_created',
        tone: 'info',
        title: 'New consultation note',
        body: 'Your doctor wrote a note for your last visit. Open Appointments to read it.',
        created_at,
        read: false,
      }
    }
    default:
      return null
  }
}

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const socket = useSocket()
  const [notifications, setNotifications] = useState([])

  // On user change, hydrate the in-memory list from localStorage.
  useEffect(() => {
    setNotifications(loadFromStorage(user?.id))
  }, [user?.id])

  // Persist every change back to localStorage (debounced via React's
  // natural batching — this is plenty fast for a list of <=100).
  useEffect(() => {
    if (user?.id) saveToStorage(user.id, notifications)
  }, [user?.id, notifications])

  const add = useCallback((n) => {
    if (!n) return
    setNotifications((prev) => {
      // Dedup by id (sockets occasionally redeliver during reconnect).
      if (prev.some((x) => x.id === n.id)) return prev
      return [n, ...prev].slice(0, STORAGE_LIMIT)
    })
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications((prev) =>
      prev.some((n) => !n.read)
        ? prev.map((n) => (n.read ? n : { ...n, read: true }))
        : prev,
    )
  }, [])

  const remove = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const clear = useCallback(() => {
    setNotifications([])
  }, [])

  // Subscribe to socket events and convert them into notifications.
  useEffect(() => {
    if (!socket || !user?.role) return

    const handler = (event) => (payload) => {
      const n = buildNotification({ event, payload, role: user.role })
      if (n) add(n)
    }

    const created = handler('appointment:created')
    const cancelled = handler('appointment:cancelled')
    const statusChanged = handler('appointment:status-changed')
    const noteCreated = handler('note:created')

    socket.on('appointment:created', created)
    socket.on('appointment:cancelled', cancelled)
    socket.on('appointment:status-changed', statusChanged)
    socket.on('note:created', noteCreated)

    return () => {
      socket.off('appointment:created', created)
      socket.off('appointment:cancelled', cancelled)
      socket.off('appointment:status-changed', statusChanged)
      socket.off('note:created', noteCreated)
    }
  }, [socket, user?.role, add])

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  )

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      add,
      markAllRead,
      remove,
      clear,
    }),
    [notifications, unreadCount, add, markAllRead, remove, clear],
  )

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx)
    throw new Error('useNotifications must be used inside <NotificationProvider>')
  return ctx
}
