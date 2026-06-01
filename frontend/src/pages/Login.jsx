import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui'
import GoogleSignInButton from '../components/GoogleSignInButton'

function dashboardPath(role) {
  if (role === 'doctor') return '/doctor'
  if (role === 'admin') return '/admin'
  return '/patient'
}

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const from = location.state?.from?.pathname

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const { data } = await api.post('/auth/login', { email, password })
      login(data.user, data.access_token)
      navigate(from || dashboardPath(data.user.role), { replace: true })
    } catch (err) {
      const status = err.response?.status
      if (status === 429) {
        setError('Too many attempts. Please try again in a few minutes.')
      } else if (status === 401) {
        setError('Invalid email or password.')
      } else if (err.response?.data?.message) {
        setError(err.response.data.message)
      } else {
        setError('Could not reach the server. Check your connection.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
          MediConnect
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink-900">Log in</h1>
        <p className="mt-1 text-sm text-ink-500">
          Welcome back. Enter your credentials to continue.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-ink-700"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-ink-300 px-3 py-2.5 text-ink-900"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-ink-700"
              >
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-xs font-medium text-brand-600 hover:text-brand-700"
              >
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-ink-300 px-3 py-2.5 text-ink-900"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-md border border-danger-bd bg-danger-bg px-3 py-2 text-sm text-danger"
            >
              {error}
            </div>
          )}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Logging in…' : 'Log in'}
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-ink-200" />
          <span className="text-xs font-medium uppercase tracking-wide text-ink-400">
            or
          </span>
          <span className="h-px flex-1 bg-ink-200" />
        </div>

        <GoogleSignInButton />

        <p className="mt-6 text-center text-sm text-ink-500">
          New to MediConnect?{' '}
          <Link
            to="/register"
            className="font-medium text-brand-600 hover:text-brand-700"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  )
}
