import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, token, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        Loading…
      </div>
    )
  }

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Doctors onboarded by an admin get a temporary password and must set
  // their own before using the app. Gate every protected route until the
  // flag is cleared — except the change-password page itself.
  if (user.must_change_password && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const fallback =
      user.role === 'admin'
        ? '/admin'
        : user.role === 'doctor'
          ? '/doctor'
          : '/patient'
    return <Navigate to={fallback} replace />
  }

  return children
}
