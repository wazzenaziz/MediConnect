import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Routes, Route, Navigate } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import Schedule from './doctor/Schedule'
import DoctorAppointments from './doctor/Appointments'
import DoctorNotes from './doctor/Notes'
import DoctorProfilePage from './doctor/Profile'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import { api } from '../lib/api'
import { Home, Calendar, CalendarClock, FileText, User } from 'lucide-react'
import { StatusBadge } from '../components/ui'

const TZ = 'Africa/Tunis'

function asUtcDate(iso) {
  if (!iso) return null
  const s = /Z$|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + 'Z'
  return new Date(s)
}

function todayISO() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ })
}

function formatTime(iso) {
  const d = asUtcDate(iso)
  if (!d) return ''
  return d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  })
}

function DoctorHome() {
  const { user } = useAuth()
  const socket = useSocket()
  const firstName = user?.full_name?.split(' ')[0]
  const [doctorId, setDoctorId] = useState(null)
  const [todays, setTodays] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    api
      .get('/doctors')
      .then(({ data }) => {
        if (cancelled) return
        const row = (data.doctors || []).find((d) => d.user_id === user.id)
        if (row) setDoctorId(row.id)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const load = useCallback(async () => {
    if (!doctorId) return
    setLoading(true)
    try {
      const { data } = await api.get(`/appointments/doctor/${doctorId}`)
      const today = todayISO()
      const list = (data.appointments || []).filter((a) => {
        if (a.status === 'cancelled') return false
        const d = asUtcDate(a.start_time)
        if (!d) return false
        const localDate = d.toLocaleDateString('en-CA', { timeZone: TZ })
        return localDate === today
      })
      list.sort((a, b) => asUtcDate(a.start_time) - asUtcDate(b.start_time))
      setTodays(list)
    } catch {
      // Non-fatal; widget just stays empty.
    } finally {
      setLoading(false)
    }
  }, [doctorId])

  useEffect(() => {
    if (doctorId) load()
  }, [doctorId, load])

  // Live refresh — if a patient books or cancels today, the widget updates.
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

  const stats = useMemo(() => {
    const pending = todays.filter((a) => a.status === 'pending').length
    const confirmed = todays.filter((a) => a.status === 'confirmed').length
    const completed = todays.filter((a) => a.status === 'completed').length
    return { total: todays.length, pending, confirmed, completed }
  }, [todays])

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
          Dashboard
        </p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">
          Welcome{firstName ? `, Dr. ${firstName}` : ''}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Here’s what your day looks like.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: 'Today', value: stats.total, tone: 'bg-slate-100 text-slate-700' },
          { label: 'Pending', value: stats.pending, tone: 'bg-amber-50 text-amber-700' },
          { label: 'Confirmed', value: stats.confirmed, tone: 'bg-sky-50 text-sky-700' },
          { label: 'Completed', value: stats.completed, tone: 'bg-emerald-50 text-emerald-700' },
        ].map((s) => (
          <div
            key={s.label}
            className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm`}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {s.label}
            </p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Today’s appointments
          </h2>
          <Link
            to="/doctor/appointments"
            className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
          >
            See all →
          </Link>
        </div>

        {loading ? (
          <p className="mt-3 text-sm text-slate-500">Loading…</p>
        ) : todays.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            No appointments today. Enjoy the quiet — or check your
            <Link to="/doctor/schedule" className="ml-1 text-emerald-700 hover:underline">
              schedule
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {todays.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between py-3"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {formatTime(a.start_time)} – {formatTime(a.end_time)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Patient #{a.patient_id.slice(0, 8)}
                  </p>
                </div>
                <StatusBadge status={a.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

const navItems = [
  { to: '/doctor', label: 'Home', icon: Home, end: true },
  { to: '/doctor/schedule', label: 'Schedule', icon: Calendar },
  { to: '/doctor/appointments', label: 'Appointments', icon: CalendarClock },
  { to: '/doctor/notes', label: 'Consultation notes', icon: FileText },
  { to: '/doctor/profile', label: 'Profile', icon: User },
]

export default function DoctorDashboard() {
  return (
    <Routes>
      <Route
        element={
          <DashboardLayout accent="emerald" roleLabel="Doctor" navItems={navItems} />
        }
      >
        <Route index element={<DoctorHome />} />
        <Route path="schedule" element={<Schedule />} />
        <Route path="appointments" element={<DoctorAppointments />} />
        <Route path="notes" element={<DoctorNotes />} />
        <Route path="profile" element={<DoctorProfilePage />} />
        <Route path="*" element={<Navigate to="/doctor" replace />} />
      </Route>
    </Routes>
  )
}
