import { useAuth } from '../context/AuthContext'

export default function DoctorDashboard() {
  const { user, logout } = useAuth()
  return (
    <div className="min-h-screen p-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
            Doctor
          </p>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome{user?.full_name ? `, Dr. ${user.full_name}` : ''}
          </h1>
        </div>
        <button
          onClick={logout}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Log out
        </button>
      </header>
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-slate-600">
          Schedule management, appointments, and consultation notes come in upcoming
          commits.
        </p>
      </section>
    </div>
  )
}
