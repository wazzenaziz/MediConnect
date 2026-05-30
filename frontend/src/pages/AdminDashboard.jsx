import { Routes, Route, Navigate } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import AdminHome from './admin/AdminHome'
import AdminPatients from './admin/Patients'
import AdminDoctors from './admin/Doctors'
import AdminAppointments from './admin/Appointments'

const navItems = [
  { to: '/admin', label: 'Overview', icon: '📊', end: true },
  { to: '/admin/patients', label: 'Patients', icon: '🧑' },
  { to: '/admin/doctors', label: 'Doctors', icon: '🩺' },
  { to: '/admin/appointments', label: 'Appointments', icon: '📅' },
]

export default function AdminDashboard() {
  return (
    <Routes>
      <Route
        element={
          <DashboardLayout
            accent="violet"
            roleLabel="Admin"
            navItems={navItems}
          />
        }
      >
        <Route index element={<AdminHome />} />
        <Route path="patients" element={<AdminPatients />} />
        <Route path="doctors" element={<AdminDoctors />} />
        <Route path="appointments" element={<AdminAppointments />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  )
}
