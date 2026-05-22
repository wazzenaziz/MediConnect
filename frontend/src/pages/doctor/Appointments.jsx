import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useSocket } from '../../context/SocketContext'

const TZ = 'Africa/Tunis'

const STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-sky-50 text-sky-700 border-sky-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
}

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
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: TZ,
    }),
    time: d.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: TZ,
    }),
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

  // Resolve the logged-in doctor's `doctors.id`.
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
        setError(
          err.response?.data?.message ||
            'Could not load your doctor profile.',
        ),
      )
    return () => {
      cancelled = true
    }
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
          api
            .get(`/patients/${pid}`)
            .then((r) => r.data.patient || r.data.user || null)
            .catch(() => null),
        ),
      )
      const map = {}
      for (const p of fetched) {
        if (p) map[p.id] = p
      }
      setPatientsById(map)
    } catch (err) {
      setError(
        err.response?.data?.message || 'Could not load appointments.',
      )
    } finally {
      setLoading(false)
    }
  }, [doctorId])

  useEffect(() => {
    if (doctorId) load()
  }, [doctorId, load])

  // Live refresh on any appointment event for this doctor.
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
      setAppointments((prev) =>
        prev.map((a) => (a.id === appt.id ? { ...a, status } : a)),
      )
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
        !start ||
        start < now ||
        a.status === 'cancelled' ||
        a.status === 'completed'
      ;(isPast ? past : upcoming).push(a)
    }
    upcoming.sort(
      (a, b) => asUtcDate(a.start_time) - asUtcDate(b.start_time),
    )
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
      <div
        key={appt.id}
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-slate-900">
              {patient?.full_name || `Patient #${appt.patient_id.slice(0, 8)}`}
            </p>
            {patient?.email && (
              <p className="text-xs text-slate-500">{patient.email}</p>
            )}
          </div>
          <span
            className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${
              STATUS_STYLES[appt.status] || STATUS_STYLES.pending
            }`}
          >
            {appt.status}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-700">
          <span>📅 {date}</span>
          <span>
            🕐 {time} – {endTime}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {appt.status === 'pending' && (
            <button
              onClick={() => setStatus(appt, 'confirmed')}
              disabled={busyId === appt.id}
              className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700 disabled:opacity-50"
            >
              Confirm
            </button>
          )}
          {appt.status === 'confirmed' && !isFutureOrToday && (
            <button
              onClick={() => setStatus(appt, 'completed')}
              disabled={busyId === appt.id}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Mark completed
            </button>
          )}
          {appt.status === 'confirmed' && isFutureOrToday && (
            <button
              onClick={() => setStatus(appt, 'completed')}
              disabled={busyId === appt.id}
              className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
            >
              Mark completed
            </button>
          )}
          {isActive && (
            <button
              onClick={() => setStatus(appt, 'cancelled')}
              disabled={busyId === appt.id}
              className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          {appt.status === 'completed' && (
            <Link
              to={`/doctor/notes?appointment=${appt.id}`}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Write note →
            </Link>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
          Doctor
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          Appointments
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Confirm bookings, mark visits complete, and review past
          consultations.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          Loading appointments…
        </div>
      ) : appointments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          No appointments yet. They’ll appear here when patients book you.
        </div>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Upcoming ({upcoming.length})
            </h2>
            {upcoming.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
                No upcoming appointments.
              </div>
            ) : (
              <div className="space-y-3">{upcoming.map(renderCard)}</div>
            )}
          </section>

          {past.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Past, completed & cancelled ({past.length})
              </h2>
              <div className="space-y-3">{past.map(renderCard)}</div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
