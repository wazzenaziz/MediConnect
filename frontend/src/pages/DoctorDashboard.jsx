import { Routes, Route, Navigate } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import Placeholder from './patient/Placeholder'
import { useAuth } from '../context/AuthContext'

function DoctorHome() {
  const { user } = useAuth()
  const firstName = user?.full_name?.split(' ')[0]
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
          Manage your schedule, see upcoming appointments, and write consultation notes.
        </p>
      </div>
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <p className="text-sm text-slate-500">
          Today’s appointments overview will appear here in an upcoming commit.
        </p>
      </div>
    </div>
  )
}

const navItems = [
  { to: '/doctor', label: 'Home', icon: '🏠', end: true },
  { to: '/doctor/schedule', label: 'Schedule', icon: '📅' },
  { to: '/doctor/appointments', label: 'Appointments', icon: '👥' },
  { to: '/doctor/notes', label: 'Consultation notes', icon: '📝' },
  { to: '/doctor/profile', label: 'Profile', icon: '👤' },
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
        <Route
          path="schedule"
          element={
            <Placeholder
              eyebrow="Doctor"
              accent="emerald"
              title="Schedule"
              description="Manage your availability and time slots."
            />
          }
        />
        <Route
          path="appointments"
          element={
            <Placeholder
              eyebrow="Doctor"
              accent="emerald"
              title="Appointments"
              description="Confirm, cancel, or review patient appointments."
            />
          }
        />
        <Route
          path="notes"
          element={
            <Placeholder
              eyebrow="Doctor"
              accent="emerald"
              title="Consultation notes"
              description="Write structured notes (diagnosis, prescription, follow-up) per patient."
            />
          }
        />
        <Route
          path="profile"
          element={
            <Placeholder
              eyebrow="Doctor"
              accent="emerald"
              title="Profile"
              description="Account and clinic information."
            />
          }
        />
        <Route path="*" element={<Navigate to="/doctor" replace />} />
      </Route>
    </Routes>
  )
}
