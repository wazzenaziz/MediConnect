import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock, Calendar, Clock } from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useSocket } from '../../context/SocketContext'
import { Card, SkeletonRows, EmptyState, StatusBadge, Button } from '../../components/ui'

const TZ = 'Africa/Tunis'

function asUtcDate(iso) {
  if (!iso) return null
  const s = /Z$|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + 'Z'
  return new Date(s)
}

function formatDateTime(iso) {
  const d = asUtcDate(iso)
  if (!d) return { date: '', time: '' }
  return {
    date: d.toLocaleDateString('en-GB', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ,
    }),
    time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: TZ }),
  }
}

export default function DoctorAppointments() {
  const { user } = useAuth()
  const socket = useSocket()
  const [doctorId, setDoctorId] = useState(null)
  const [appointments, setAppointments] = useState([])
  const [patientsById, setPatientsById] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    api
      .get('/doctors')
      .then(({ data }) => {
        if (cancelled) return
        const row = (data.doctors || []).find((d) => d.user_id === user.id)
        if (row) setDoctorId(row.id)
        else setError('No doctor profile linked to your account.')
      })
      .catch((err) =>
        setError(err.response?.data?.message || 'Could not load your doctor profile.'),
      )
    return () => { cancelled = true }
  }, [user?.id])

  const load = useCallback(async () => {
    if (!doctorId) return
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get(`/appointments/doctor/${doctorId}`)
      const list = data.appointments || []
      setAppointments(list)

      const patientIds = [...new Set(list.map((a) => a.patient_id))]
      const fetched = await Promise.all(
        patientIds.map((pid) =>
          api.get(`/patients/${pid}`).then((r) => r.data.patient || r.data.user || null).catch(() => null),
        ),
      )
      const map = {}
      for (const p of fetched) if (p) map[p.id] = p
      setPatientsById(map)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load appointments.')
    } finally {
      setLoading(false)
    }
  }, [doctorId])

  useEffect(() => {
    if (doctorId) load()
  }, [doctorId, load])

  useEffect(() => {
    if (!socket) return
    const refresh = () => load()
    socket.on('appointment:created', refresh)
    socket.on('appointment:cancelled', refresh)
    return () => {
      socket.off('appointment:created', refresh)
      socket.off('appointment:cancelled', refresh)
    }
  }, [socket, load])

  async function setStatus(appt, status) {
    setBusyId(appt.id)
    setActionError(null)
    try {
      await api.patch(`/appointments/${appt.id}/status`, { status })
      setAppointments((prev) => prev.map((a) => (a.id === appt.id ? { ...a, status } : a)))
    } catch (err) {
      setActionError(
        err.response?.data?.message ||
          err.response?.data?.errors?.[0]?.message ||
          `Could not set status to ${status}.`,
      )
    } finally {
      setBusyId(null)
    }
  }

  const now = new Date()
  const { upcoming, past } = useMemo(() => {
    const upcoming = []
    const past = []
    for (const a of appointments) {
      const start = asUtcDate(a.start_time)
      const isPast =
        !start || start < now || a.status === 'cancelled' || a.status === 'completed'
      ;(isPast ? past : upcoming).push(a)
    }
    upcoming.sort((a, b) => asUtcDate(a.start_time) - asUtcDate(b.start_time))
    past.sort((a, b) => asUtcDate(b.start_time) - asUtcDate(a.start_time))
    return { upcoming, past }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointments])

  function renderCard(appt) {
    const patient = patientsById[appt.patient_id]
    const { date, time } = formatDateTime(appt.start_time)
    const { time: endTime } = formatDateTime(appt.end_time)
    const start = asUtcDate(appt.start_time)
    const isFutureOrToday = start && start >= new Date(now.toDateString())
    const isActive = appt.status !== 'cancelled' && appt.status !== 'completed'

    return (
      <Card key={appt.id} className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-ink-900">
              {patient?.full_name || `Patient #${appt.patient_id.slice(0, 8)}`}
            </p>
            {patient?.email && <p className="text-xs text-ink-500">{patient.email}</p>}
          </div>
          <StatusBadge status={appt.status} />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-700">
          <span className="inline-flex items-center gap-1.5">
            <Calendar size={15} strokeWidth={1.8} className="text-ink-400" /> {date}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock size={15} strokeWidth={1.8} className="text-ink-400" /> {time} – {endTime}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {appt.status === 'pending' && (
            <Button size="sm" onClick={() => setStatus(appt, 'confirmed')} disabled={busyId === appt.id}>
              Confirm
            </Button>
          )}
          {appt.status === 'confirmed' && (
            <button
              onClick={() => setStatus(appt, 'completed')}
              disabled={busyId === appt.id}
              className={`inline-flex items-center justify-center rounded-md px-3 py-1.5 text-[13px] font-semibold transition disabled:opacity-50 ${
                isFutureOrToday
                  ? 'border border-success-bd bg-white text-success hover:bg-success-bg'
                  : 'bg-success text-white hover:opacity-90'
              }`}
            >
              Mark completed
            </button>
          )}
          {isActive && (
            <Button variant="danger" size="sm" onClick={() => setStatus(appt, 'cancelled')} disabled={busyId === appt.id}>
              Cancel
            </Button>
          )}
          {appt.status === 'completed' && (
            <Link to={`/doctor/notes?appointment=${appt.id}`}>
              <Button variant="secondary" size="sm">Write note →</Button>
            </Link>
          )}
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">Doctor</p>
        <h1 className="mt-1 text-2xl font-bold text-ink-900">Appointments</h1>
        <p className="mt-1 text-sm text-ink-500">
          Confirm bookings, mark visits complete, and review past consultations.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-danger-bd bg-danger-bg px-3 py-2 text-sm text-danger">{error}</div>
      )}
      {actionError && (
        <div className="rounded-md border border-danger-bd bg-danger-bg px-3 py-2 text-sm text-danger">{actionError}</div>
      )}

      {loading ? (
        <Card className="p-6"><SkeletonRows rows={5} /></Card>
      ) : appointments.length === 0 ? (
        <EmptyState
          icon={<CalendarClock size={40} strokeWidth={1.5} />}
          title="No appointments yet"
          hint="They&rsquo;ll appear here when patients book you."
        />
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">
              Upcoming ({upcoming.length})
            </h2>
            {upcoming.length === 0 ? (
              <Card className="flex flex-col items-center gap-2 p-8 text-center">
                <CalendarClock size={32} strokeWidth={1.5} className="text-ink-300" />
                <p className="text-sm font-medium text-ink-600">No upcoming appointments</p>
              </Card>
            ) : (
              <div className="space-y-3">{upcoming.map(renderCard)}</div>
            )}
          </section>

          {past.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">
                Past, completed &amp; cancelled ({past.length})
              </h2>
              <div className="space-y-3">{past.map(renderCard)}</div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
