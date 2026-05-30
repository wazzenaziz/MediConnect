import { useEffect, useMemo, useState } from 'react'
import { api } from '../../lib/api'
import { Calendar } from 'lucide-react'
import { StatusBadge, Person, Card, SkeletonRows, EmptyState } from '../../components/ui'

const TZ = 'Africa/Tunis'

function asUtcDate(iso) {
  if (!iso) return null
  const s = /Z$|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + 'Z'
  return new Date(s)
}

function formatDateTime(iso) {
  const d = asUtcDate(iso)
  if (!d) return ''
  return d.toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  })
}

export default function AdminAppointments() {
  const [appointments, setAppointments] = useState([])
  const [patientsById, setPatientsById] = useState({})
  const [doctorsById, setDoctorsById] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    // Appointments only carry IDs, so resolve patient/doctor names from the
    // admin-only /patients and /doctors lists (id → person maps).
    Promise.all([
      api.get('/appointments'),
      api.get('/patients'),
      api.get('/doctors'),
    ])
      .then(([appts, patients, doctors]) => {
        if (cancelled) return
        setAppointments(appts.data.appointments || [])
        const pMap = {}
        for (const p of patients.data.patients || patients.data.users || [])
          pMap[p.id] = p
        setPatientsById(pMap)
        const dMap = {}
        for (const d of doctors.data.doctors || []) dMap[d.id] = d
        setDoctorsById(dMap)
      })
      .catch((err) => {
        if (!cancelled)
          setError(
            err.response?.data?.message || 'Could not load appointments.',
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    const list =
      statusFilter === 'all'
        ? appointments
        : appointments.filter((a) => a.status === statusFilter)
    return [...list].sort(
      (a, b) => asUtcDate(b.start_time) - asUtcDate(a.start_time),
    )
  }, [appointments, statusFilter])

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
          Admin
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink-900">
          All appointments
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          {appointments.length} appointment
          {appointments.length === 1 ? '' : 's'} across the platform. Sorted
          most-recent first.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map(
          (s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full border px-3 py-1 text-xs font-medium capitalize ${
                statusFilter === s
                  ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                  : 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50'
              }`}
            >
              {s}
            </button>
          ),
        )}
      </div>

      {error && (
        <div className="rounded-md border border-danger-bd bg-danger-bg px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {loading ? (
        <Card className="p-6">
          <SkeletonRows rows={6} />
        </Card>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Calendar size={40} strokeWidth={1.5} />}
          title="No appointments matching this filter"
          hint="Try a different status, or check back once patients start booking."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-card">
          <table className="min-w-full divide-y divide-ink-200 text-sm">
            <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-3 text-left">When</th>
                <th className="px-4 py-3 text-left">Patient</th>
                <th className="px-4 py-3 text-left">Doctor</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-150">
              {filtered.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3 text-ink-700">
                    {formatDateTime(a.start_time)}
                  </td>
                  <td className="px-4 py-3">
                    <Person
                      id={a.patient_id}
                      name={patientsById[a.patient_id]?.full_name}
                      sub={patientsById[a.patient_id]?.email}
                    />
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const d = doctorsById[a.doctor_id]
                      return (
                        <Person
                          id={a.doctor_id}
                          name={d?.full_name ? `Dr. ${d.full_name}` : undefined}
                          sub={d?.specialty}
                        />
                      )
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={a.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
