// ============================================================
// MediConnect — App.jsx   (REPLACE existing)
// Only change vs. current: wrap everything in <ThemeProvider>
// so the dark/light toggle works app-wide. Routes untouched.
// ============================================================
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'
import { ToastProvider } from './context/ToastContext'
import { NotificationProvider } from './context/NotificationContext'
import { ConfirmProvider } from './context/ConfirmContext'
import RealtimeBridge from './components/RealtimeBridge'
import ProtectedRoute from './components/ProtectedRoute'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import PatientDashboard from './pages/PatientDashboard'
import DoctorDashboard from './pages/DoctorDashboard'
import AdminDashboard from './pages/AdminDashboard'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <ToastProvider>
            <NotificationProvider>
              <ConfirmProvider>
                <RealtimeBridge />
                <BrowserRouter>
                  <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route
                      path="/patient/*"
                      element={
                        <ProtectedRoute allowedRoles={['patient']}>
                          <PatientDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/doctor/*"
                      element={
                        <ProtectedRoute allowedRoles={['doctor']}>
                          <DoctorDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/*"
                      element={
                        <ProtectedRoute allowedRoles={['admin']}>
                          <AdminDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </BrowserRouter>
              </ConfirmProvider>
            </NotificationProvider>
          </ToastProvider>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
