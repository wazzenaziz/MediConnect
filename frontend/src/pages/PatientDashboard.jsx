import { Routes, Route, Navigate } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import PatientHome from './patient/PatientHome'
import Placeholder from './patient/Placeholder'
import Triage from './patient/Triage'

const navItems = [
  { to: '/patient', label: 'Home', icon: '🏠', end: true },
  { to: '/patient/triage', label: 'Triage', icon: '🩺' },
  { to: '/patient/doctors', label: 'Find doctors', icon: '📍' },
  { to: '/patient/appointments', label: 'Appointments', icon: '📅' },
  { to: '/patient/profile', label: 'Profile', icon: '👤' },
]

export default function PatientDashboard() {
  return (
    <Routes>
      <Route
        element={<DashboardLayout accent="sky" roleLabel="Patient" navItems={navItems} />}
      >
        <Route index element={<PatientHome />} />
        <Route path="triage" element={<Triage />} />
        <Route
          path="doctors"
          element={
            <Placeholder
              title="Find a doctor"
              description="Map + nearby search coming soon."
            />
          }
        />
        <Route
          path="appointments"
          element={
            <Placeholder
              title="My appointments"
              description="Upcoming and past visits will appear here."
            />
          }
        />
        <Route
          path="profile"
          element={
            <Placeholder
              title="Profile"
              description="Account settings will appear here."
            />
          }
        />
        <Route path="*" element={<Navigate to="/patient" replace />} />
      </Route>
    </Routes>
  )
}
