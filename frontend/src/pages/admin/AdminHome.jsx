import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Stethoscope } from 'lucide-react'
import { api } from '../../lib/api'
import { Card, StatusBadge, Skeleton } from '../../components/ui'

// Prominent headline metric with a coloured left accent.
function HeadlineStat({ label, value, loading, accent, icon }) {
  return (
    <Card className={`border-l-[3px] ${accent} p-5`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
          {label}
        </p>
        {icon}
      </div>
      {loading ? (
        <Skeleton w={64} h={36} className="mt-3" />
      ) : (
        <p className="mt-3 text-4xl font-extrabold text-ink-900">{value ?? 0}</p>
      )}
    </Card>
  )
}

// A status total with its count, used inside the Appointments card.
function StatusTotal({ status, value, loading }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2.5">
      <StatusBadge status={status} />
      {loading ? (
        <Skeleton w={28} h={20} />
      ) : (
        <span className="text-lg font-bold text-ink-900">{value ?? 0}</span>
      )}
    </div>
  )
}

export default function AdminHome() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .get('/admin/stats')
      .then(({ data }) => {
        if (!cancelled) setStats(data.stats)
      })
      .catch((err) => {
        if (!cancelled)
          setError(
            err.response?.data?.message || 'Could not load platform stats.',
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
          Admin
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink-900">
          Platform overview
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Live snapshot of users and appointments across MediConnect.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-danger-bd bg-danger-bg px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Row 1 — the two headline counts. */}
      <div className="grid gap-4 sm:grid-cols-2">
        <HeadlineStat
          label="Patients"
          value={stats?.patientsCount}
          loading={loading}
          accent="border-brand-600"
          icon={<Users size={20} strokeWidth={1.8} className="text-brand-600" />}
        />
        <HeadlineStat
          label="Active doctors"
          value={stats?.doctorsCount}
          loading={loading}
          accent="border-teal-600"
          icon={<Stethoscope size={20} strokeWidth={1.8} className="text-teal-600" />}
        />
      </div>

      {/* Row 2 — appointments total with a status breakdown (pending first). */}
      <Card className="p-5">
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            Appointments
          </p>
          {loading ? (
            <Skeleton w={48} h={28} />
          ) : (
            <span className="text-2xl font-extrabold text-ink-900">
              {stats?.appointmentsCount ?? 0}
            </span>
          )}
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <StatusTotal
            status="pending"
            value={stats?.pendingAppointments}
            loading={loading}
          />
          <StatusTotal
            status="confirmed"
            value={stats?.confirmedAppointments}
            loading={loading}
          />
          <StatusTotal
            status="completed"
            value={stats?.completedAppointments}
            loading={loading}
          />
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        <Link
          to="/admin/patients"
          className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card transition hover:border-indigo-300 hover:shadow-md"
        >
          <p className="font-semibold text-ink-900">Manage patients →</p>
          <p className="mt-1 text-xs text-ink-500">
            View and remove patient accounts.
          </p>
        </Link>
        <Link
          to="/admin/doctors"
          className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card transition hover:border-indigo-300 hover:shadow-md"
        >
          <p className="font-semibold text-ink-900">Manage doctors →</p>
          <p className="mt-1 text-xs text-ink-500">
            Onboard new doctors or remove existing profiles.
          </p>
        </Link>
        <Link
          to="/admin/appointments"
          className="rounded-2xl border border-ink-200 bg-white p-5 shadow-card transition hover:border-indigo-300 hover:shadow-md"
        >
          <p className="font-semibold text-ink-900">All appointments →</p>
          <p className="mt-1 text-xs text-ink-500">
            Read-only view of every booking in the system.
          </p>
        </Link>
      </div>
    </div>
  )
}
