import { Link } from 'react-router-dom'
import { Stethoscope, MapPin, Calendar } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const actions = [
  {
    to: '/patient/triage',
    title: 'Describe your symptoms',
    description:
      'Tell our AI assistant what you’re feeling and get a specialty suggestion.',
    cta: 'Start triage',
    icon: Stethoscope,
  },
  {
    to: '/patient/doctors',
    title: 'Find nearby doctors',
    description: 'Browse specialists close to you and see their available slots.',
    cta: 'Search doctors',
    icon: MapPin,
  },
  {
    to: '/patient/appointments',
    title: 'My appointments',
    description: 'Review upcoming visits, past consultations, and any notes.',
    cta: 'View appointments',
    icon: Calendar,
  },
]

export default function PatientHome() {
  const { user } = useAuth()
  const firstName = user?.full_name?.split(' ')[0]

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">
          Dashboard
        </p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">
          Welcome{firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          What would you like to do today?
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {actions.map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-sky-300 hover:shadow-md"
          >
            <action.icon size={28} strokeWidth={1.8} className="text-brand-600" aria-hidden="true" />
            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              {action.title}
            </h2>
            <p className="mt-1 flex-1 text-sm text-slate-500">
              {action.description}
            </p>
            <span className="mt-4 text-sm font-medium text-sky-600 group-hover:text-sky-700">
              {action.cta} →
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
