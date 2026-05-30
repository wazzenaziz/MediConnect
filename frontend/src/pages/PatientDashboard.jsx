import { Routes, Route, Navigate } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import PatientHome from './patient/PatientHome'
import Triage from './patient/Triage'
import Doctors from './patient/Doctors'
import DoctorProfile from './patient/DoctorProfile'
import Appointments from './patient/Appointments'
import PatientProfile from './patient/Profile'
import { Home, Stethoscope, MapPin, Calendar, User } from 'lucide-react'

const navItems = [
  { to: '/patient', label: 'Home', icon: Home, end: true },
  { to: '/patient/triage', label: 'Triage', icon: Stethoscope },
  { to: '/patient/doctors', label: 'Find doctors', icon: MapPin },
  { to: '/patient/appointments', label: 'Appointments', icon: Calendar },
  { to: '/patient/profile', label: 'Profile', icon: User },
]

export default function PatientDashboard() {
  return (
    <Routes>
      <Route
        element={<DashboardLayout accent="sky" roleLabel="Patient" navItems={navItems} />}
      >
        <Route index element={<PatientHome />} />
        <Route path="triage" element={<Triage />} />
        <Route path="doctors" element={<Doctors />} />
        <Route path="doctors/:id" element={<DoctorProfile />} />
        <Route path="appointments" element={<Appointments />} />
        <Route path="profile" element={<PatientProfile />} />
        <Route path="*" element={<Navigate to="/patient" replace />} />
      </Route>
    </Routes>
  )
}
