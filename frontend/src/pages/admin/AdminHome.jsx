import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'

const STAT_CARDS = [
  { key: 'patientsCount', label: 'Patients', tone: 'text-sky-700 bg-sky-50' },
  { key: 'doctorsCount', label: 'Doctors', tone: 'text-emerald-700 bg-emerald-50' },
  { key: 'appointmentsCount', label: 'Total appointments', tone: 'text-violet-700 bg-violet-50' },
  { key: 'pendingAppointments', label: 'Pending', tone: 'text-amber-700 bg-amber-50' },
  { key: 'confirmedAppointments', label: 'Confirmed', tone: 'text-sky-700 bg-sky-50' },
  { key: 'completedAppointments', label: 'Completed', tone: 'text-emerald-700 bg-emerald-50' },
  { key: 'cancelledAppointments', label: 'Cancelled', tone: 'text-rose-700 bg-rose-50' },
]

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
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
          Admin
        </p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">
          Platform overview
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Live snapshot of users and appointments across MediConnect.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_CARDS.map((card) => {
          const value = stats ? stats[card.key] : null
          return (
            <div
              key={card.key}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${card.tone}`}
              >
                {card.label}
              </span>
              <p className="mt-3 text-3xl font-bold text-slate-900">
                {loading ? '…' : (value ?? 0)}
              </p>
            </div>
          )
        })}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Link
          to="/admin/patients"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-violet-300"
        >
          <p className="font-semibold text-slate-900">Manage patients →</p>
          <p className="mt-1 text-xs text-slate-500">
            View and remove patient accounts.
          </p>
        </Link>
        <Link
          to="/admin/doctors"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-violet-300"
        >
          <p className="font-semibold text-slate-900">Manage doctors →</p>
          <p className="mt-1 text-xs text-slate-500">
            Onboard new doctors or remove existing profiles.
          </p>
        </Link>
        <Link
          to="/admin/appointments"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-violet-300"
        >
          <p className="font-semibold text-slate-900">All appointments →</p>
          <p className="mt-1 text-xs text-slate-500">
            Read-only view of every booking in the system.
          </p>
        </Link>
      </div>
    </div>
  )
}
