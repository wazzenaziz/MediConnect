import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useSocket } from '../../context/SocketContext'
import { useConfirm } from '../../context/ConfirmContext'
import { Calendar } from 'lucide-react'
import { StatusBadge, Button, Card, SkeletonRows, EmptyState } from '../../components/ui'

const TZ = 'Africa/Tunis'

function formatDateTime(iso) {
  // The backend stores TIMESTAMP (timezone-naive) but we always insert
  // UTC values. When Supabase returns the row we get a string like
  // "2026-06-03T08:00:00" with no Z, which `new Date()` would interpret
  // as local time. Append Z so it's parsed as UTC, then format in Tunis.
  const normalized =
    /Z$|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + 'Z'
  const d = new Date(normalized)
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

export default function Appointments() {
  const { user } = useAuth()
  const confirm = useConfirm()
  const [appointments, setAppointments] = useState([])
  const [doctorsById, setDoctorsById] = useState({})
  // Indexed by appointment_id so completed cards can show their note inline.
  const [notesByAppt, setNotesByAppt] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [cancellingId, setCancellingId] = useState(null)
  const [actionError, setActionError] = useState(null)

  async function load() {
    if (!user?.id) return
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get(`/appointments/patient/${user.id}`)
      const list = data.appointments || []
      setAppointments(list)

      // Hydrate doctor names for display. We fetch each doctor by id
      // (small N — usually <10 — and the doctor endpoint is cached
      // server-side by Supabase anyway).
      const uniqueDoctorIds = [...new Set(list.map((a) => a.doctor_id))]
      const fetched = await Promise.all(
        uniqueDoctorIds.map((did) =>
          api
            .get(`/doctors/${did}`)
            .then((r) => r.data.doctor)
            .catch(() => null),
        ),
      )
      const map = {}
      for (const d of fetched) {
        if (d) map[d.id] = d
      }
      setDoctorsById(map)

      // Pull all of this patient's notes in one request. The backend's
      // RLS-style check restricts the result to notes whose patient_id
      // matches the logged-in user, so this is safe even without query
      // filters here. Empty list is the common case.
      try {
        const { data: notesData } = await api.get(`/notes/patient/${user.id}`)
        const notes = notesData.notes || notesData.note || []
        const byAppt = {}
        for (const n of Array.isArray(notes) ? notes : [notes]) {
          if (n?.appointment_id) byAppt[n.appointment_id] = n
        }
        setNotesByAppt(byAppt)
      } catch {
        // Notes are non-critical for the appointments view — swallow.
        setNotesByAppt({})
      }
    } catch (err) {
      setError(
        err.response?.data?.message || 'Could not load your appointments.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // Realtime: if an appointment event fires for this user from another
  // tab or the other party (e.g. doctor cancels), re-fetch the list so
  // status/membership reflect reality without a manual refresh.
  const socket = useSocket()
  useEffect(() => {
    if (!socket) return
    const refresh = () => load()
    socket.on('appointment:created', refresh)
    socket.on('appointment:cancelled', refresh)
    return () => {
      socket.off('appointment:created', refresh)
      socket.off('appointment:cancelled', refresh)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, user?.id])

  async function handleCancel(appt) {
    const ok = await confirm({
      title: 'Cancel this appointment?',
      description: 'This cannot be undone.',
      confirmLabel: 'Yes, cancel',
      cancelLabel: 'Keep it',
      tone: 'danger',
    })
    if (!ok) return
    setCancellingId(appt.id)
    setActionError(null)
    try {
      await api.patch(`/appointments/${appt.id}/cancel`)
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === appt.id ? { ...a, status: 'cancelled' } : a,
        ),
      )
    } catch (err) {
      setActionError(
        err.response?.data?.message || 'Could not cancel the appointment.',
      )
    } finally {
      setCancellingId(null)
    }
  }

  const now = new Date()
  const upcoming = appointments
    .filter(
      (a) =>
        new Date(a.start_time) >= now &&
        a.status !== 'cancelled' &&
        a.status !== 'completed',
    )
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))

  // Build a quick lookup of every active (non-cancelled, non-completed)
  // appointment by `doctor_id|start_time` so we can hide the "Book again"
  // button on a cancelled card when the patient has already rebooked the
  // exact same slot.
  const activeKeys = new Set(
    appointments
      .filter((a) => a.status !== 'cancelled' && a.status !== 'completed')
      .map((a) => `${a.doctor_id}|${a.start_time}`),
  )

  const past = appointments
    .filter(
      (a) =>
        new Date(a.start_time) < now ||
        a.status === 'cancelled' ||
        a.status === 'completed',
    )
    .sort((a, b) => new Date(b.start_time) - new Date(a.start_time))

  function renderCard(appt) {
    const doctor = doctorsById[appt.doctor_id]
    const { date, time } = formatDateTime(appt.start_time)
    const { time: endTime } = formatDateTime(appt.end_time)
    const isUpcoming =
      new Date(appt.start_time) >= now &&
      appt.status !== 'cancelled' &&
      appt.status !== 'completed'
    return (
      <div
        key={appt.id}
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-slate-900">
              Dr. {doctor?.full_name || 'Doctor'}
            </p>
            <p className="text-xs font-medium text-sky-700">
              {doctor?.specialty || '—'}
            </p>
          </div>
          <StatusBadge status={appt.status} />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-700">
          <span>📅 {date}</span>
          <span>
            🕐 {time} – {endTime}
          </span>
        </div>

        {doctor?.clinic_address && (
          <p className="mt-1 text-xs text-slate-500">
            📍 {doctor.clinic_address}
          </p>
        )}

        {appt.status === 'completed' && notesByAppt[appt.id] && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Doctor’s note
            </p>
            <dl className="mt-2 space-y-2 text-sm">
              {notesByAppt[appt.id].diagnosis && (
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Diagnosis
                  </dt>
                  <dd className="text-slate-800">
                    {notesByAppt[appt.id].diagnosis}
                  </dd>
                </div>
              )}
              {notesByAppt[appt.id].prescription && (
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Prescription
                  </dt>
                  <dd className="whitespace-pre-wrap text-slate-800">
                    {notesByAppt[appt.id].prescription}
                  </dd>
                </div>
              )}
              {notesByAppt[appt.id].note_text && (
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Notes
                  </dt>
                  <dd className="whitespace-pre-wrap text-slate-800">
                    {notesByAppt[appt.id].note_text}
                  </dd>
                </div>
              )}
              {notesByAppt[appt.id].follow_up_date && (
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Follow-up
                  </dt>
                  <dd className="text-slate-800">
                    {new Date(
                      notesByAppt[appt.id].follow_up_date,
                    ).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {appt.status === 'completed' && !notesByAppt[appt.id] && (
          <p className="mt-3 text-xs italic text-slate-400">
            Your doctor hasn’t written a note for this visit yet.
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {isUpcoming && (
            <button
              onClick={() => handleCancel(appt)}
              disabled={cancellingId === appt.id}
              className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cancellingId === appt.id ? 'Cancelling…' : 'Cancel'}
            </button>
          )}
          {appt.status === 'cancelled' &&
            !activeKeys.has(`${appt.doctor_id}|${appt.start_time}`) && (
            <Link
              to={`/patient/doctors/${appt.doctor_id}?date=${
                // Pull the YYYY-MM-DD as seen in Tunis local time so the
                // slot picker opens on the same day the patient cancelled.
                new Date(
                  /Z$|[+-]\d{2}:?\d{2}$/.test(appt.start_time)
                    ? appt.start_time
                    : appt.start_time + 'Z',
                ).toLocaleDateString('en-CA', { timeZone: TZ })
              }`}
              className="rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-50"
            >
              Book again →
            </Link>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">
          Patient
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          My appointments
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Upcoming visits, past consultations, and cancellations.
        </p>
      </div>

      {actionError && (
        <div className="rounded-md border border-danger-bd bg-danger-bg px-3 py-2 text-sm text-danger">
          {actionError}
        </div>
      )}

      {error && (
        <div className="rounded-md border border-danger-bd bg-danger-bg px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {loading ? (
        <Card className="p-6">
          <SkeletonRows rows={4} />
        </Card>
      ) : appointments.length === 0 ? (
        <EmptyState
          icon={<Calendar size={40} strokeWidth={1.5} />}
          title="You don’t have any appointments yet"
          hint="Get started by finding a doctor and picking a time."
          action={
            <Link to="/patient/doctors">
              <Button>Find a doctor</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">
              Upcoming ({upcoming.length})
            </h2>
            {upcoming.length === 0 ? (
              <div className="rounded-xl border border-ink-200 bg-white p-6 text-center text-sm text-ink-500">
                No upcoming appointments.
              </div>
            ) : (
              <div className="space-y-3">{upcoming.map(renderCard)}</div>
            )}
          </section>

          {past.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Past & cancelled ({past.length})
              </h2>
              <div className="space-y-3">{past.map(renderCard)}</div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
