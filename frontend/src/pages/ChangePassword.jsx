import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import PasswordField from '../components/PasswordField'

// Forced first-login password change. Doctors onboarded by an admin land
// here (via ProtectedRoute) because their account was created with a
// temporary password. After a successful change we clear the flag in auth
// state and send them to their dashboard.
function dashboardPath(role) {
  if (role === 'doctor') return '/doctor'
  if (role === 'admin') return '/admin'
  return '/patient'
}

export default function ChangePassword() {
  const navigate = useNavigate()
  const { user, updateUser, logout } = useAuth()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const mismatch = confirm.length > 0 && password !== confirm

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setSubmitting(true)
    try {
      await api.post('/auth/change-password', { password })
      updateUser({ must_change_password: false })
      navigate(dashboardPath(user?.role), { replace: true })
    } catch (err) {
      const fieldErr = err.response?.data?.errors?.[0]?.message
      setError(
        fieldErr ||
          err.response?.data?.message ||
          'Could not change your password. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-ink-200 bg-white p-7 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
          MediConnect
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink-900">
          Set a new password
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Your account was created with a temporary password. Please choose your
          own password to continue.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-600">
              New password
            </label>
            <PasswordField
              id="new_password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              inputClassName="mt-1 w-full rounded-lg border border-ink-300 bg-white px-3 py-2 text-sm text-ink-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-600">
              Confirm new password
            </label>
            <PasswordField
              id="confirm_new_password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              invalid={mismatch}
              placeholder="Re-enter the password"
              inputClassName={`mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm text-ink-900 ${
                mismatch ? 'border-red-400' : 'border-ink-300'
              }`}
            />
            {mismatch && (
              <p className="mt-1 text-xs text-red-600">Passwords do not match.</p>
            )}
          </div>

          {error && (
            <div className="rounded-md border border-danger-bd bg-danger-bg px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || mismatch}
            className="w-full rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {submitting ? 'Saving…' : 'Set password and continue'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            logout()
            navigate('/login', { replace: true })
          }}
          className="mt-4 w-full text-center text-xs text-ink-500 hover:text-ink-700"
        >
          Sign out instead
        </button>
      </div>
    </div>
  )
}
