import { useEffect } from 'react'
import { useSocket } from '../context/SocketContext'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'

const TZ = 'Africa/Tunis'

function formatWhen(iso) {
  if (!iso) return ''
  const normalized = /Z$|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + 'Z'
  const d = new Date(normalized)
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
 * Lives inside SocketProvider + ToastProvider + AuthProvider. Listens
 * to global appointment events and surfaces them as toasts. The
 * doctor:slot-changed event is consumed by DoctorProfile separately
 * because only that page cares about live slot updates.
 */
export default function RealtimeBridge() {
  const socket = useSocket()
  const { toast } = useToast()
  const { user } = useAuth()

  useEffect(() => {
    if (!socket) return

    function onCreated({ appointment, patient }) {
      if (!appointment) return
      if (user?.role === 'doctor') {
        toast({
          tone: 'success',
          title: 'New appointment booked',
          body: `${patient?.full_name || 'A patient'} booked you for ${formatWhen(appointment.start_time)}.`,
        })
      } else {
        // Patient also gets a confirmation in any other open tabs.
        toast({
          tone: 'success',
          title: 'Appointment confirmed',
          body: `Your visit is set for ${formatWhen(appointment.start_time)}.`,
          duration: 4000,
        })
      }
    }

    function onCancelled({ appointment, cancelled_by }) {
      if (!appointment) return
      const when = formatWhen(appointment.start_time)
      if (user?.role === 'doctor') {
        toast({
          tone: 'warning',
          title: 'Appointment cancelled',
          body:
            cancelled_by === 'patient'
              ? `Your patient cancelled the ${when} appointment.`
              : `The ${when} appointment was cancelled.`,
        })
      } else {
        toast({
          tone: 'warning',
          title: 'Appointment cancelled',
          body:
            cancelled_by === 'doctor'
              ? `The doctor cancelled your ${when} appointment.`
              : `Your ${when} appointment was cancelled.`,
        })
      }
    }

    socket.on('appointment:created', onCreated)
    socket.on('appointment:cancelled', onCancelled)

    return () => {
      socket.off('appointment:created', onCreated)
      socket.off('appointment:cancelled', onCancelled)
    }
  }, [socket, toast, user?.role])

  return null
}
