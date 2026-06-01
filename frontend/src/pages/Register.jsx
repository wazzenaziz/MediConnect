import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui'
import PasswordField from '../components/PasswordField'

const PHONE_RE = /^\+?[0-9]{8,15}$/

function validate({ full_name, email, password, confirm_password, phone }) {
  if (full_name.trim().length < 2) return 'Full name must be at least 2 characters.'
  if (full_name.trim().length > 100) return 'Full name is too long.'
  if (!/^\S+@\S+\.\S+$/.test(email)) return 'Please enter a valid email address.'
  if (password.length < 8) return 'Password must be at least 8 characters.'
  if (password.length > 72) return 'Password cannot exceed 72 characters.'
  if (password !== confirm_password) return 'Passwords do not match.'
  if (phone && !PHONE_RE.test(phone))
    return 'Phone must be 8–15 digits, with an optional + prefix.'
  return null
}

export default function Register() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
    phone: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  // Live confirm-password check: only flag once the user has started
  // typing the confirmation, so the field isn't red before it's touched.
  const passwordsMismatch =
    form.confirm_password.length > 0 && form.password !== form.confirm_password

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setInfo(null)

    const clientError = validate(form)
    if (clientError) {
      setError(clientError)
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        confirm_password: form.confirm_password,
      }
      if (form.phone.trim()) payload.phone = form.phone.trim()

      const { data } = await api.post('/auth/register', payload)

      if (data.access_token) {
        const profile = {
          id: data.user?.id,
          email: data.user?.email,
          full_name: data.user?.full_name || payload.full_name,
          role: data.user?.role || 'patient',
        }
        login(profile, data.access_token)
        navigate('/patient', { replace: true })
        return
      }

      setInfo(
        'Account created. Please check your email to confirm, then log in.',
      )
      setTimeout(() => navigate('/login', { replace: true }), 2000)
    } catch (err) {
      const status = err.response?.status
      const apiMsg = err.response?.data?.error || err.response?.data?.message
      if (status === 429) {
        setError('Too many attempts. Please try again in a few minutes.')
      } else if (status === 400 && apiMsg) {
        setError(apiMsg)
      } else if (apiMsg) {
        setError(apiMsg)
      } else {
        setError('Could not reach the server. Check your connection.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
          MediConnect
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink-900">Create account</h1>
        <p className="mt-1 text-sm text-ink-500">
          Sign up as a patient. Doctors are onboarded by an administrator.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <div>
            <label
              htmlFor="full_name"
              className="block text-sm font-medium text-ink-700"
            >
              Full name
            </label>
            <input
              id="full_name"
              type="text"
              autoComplete="name"
              required
              value={form.full_name}
              onChange={update('full_name')}
              className="mt-1 block w-full rounded-md border border-ink-300 px-3 py-2.5 text-ink-900"
              placeholder="Jane Doe"
            />
          </div>

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
              value={form.email}
              onChange={update('email')}
              className="mt-1 block w-full rounded-md border border-ink-300 px-3 py-2.5 text-ink-900"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-ink-700"
            >
              Phone <span className="text-ink-400">(optional)</span>
            </label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={update('phone')}
              className="mt-1 block w-full rounded-md border border-ink-300 px-3 py-2.5 text-ink-900"
              placeholder="+21612345678"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-ink-700"
            >
              Password
            </label>
            <PasswordField
              id="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={form.password}
              onChange={update('password')}
              inputClassName="mt-1 block w-full rounded-md border border-ink-300 px-3 py-2.5 text-ink-900"
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label
              htmlFor="confirm_password"
              className="block text-sm font-medium text-ink-700"
            >
              Confirm password
            </label>
            <PasswordField
              id="confirm_password"
              autoComplete="new-password"
              required
              minLength={8}
              value={form.confirm_password}
              onChange={update('confirm_password')}
              invalid={passwordsMismatch}
              inputClassName={`mt-1 block w-full rounded-md border px-3 py-2.5 text-ink-900 ${
                passwordsMismatch ? 'border-danger' : 'border-ink-300'
              }`}
              placeholder="Re-enter your password"
            />
            {passwordsMismatch && (
              <p className="mt-1 text-xs text-danger">Passwords do not match.</p>
            )}
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-md border border-danger-bd bg-danger-bg px-3 py-2 text-sm text-danger"
            >
              {error}
            </div>
          )}

          {info && (
            <div
              role="status"
              className="rounded-md border border-success-bd bg-success-bg px-3 py-2 text-sm text-success"
            >
              {info}
            </div>
          )}

          <Button
            type="submit"
            disabled={submitting || passwordsMismatch}
            className="w-full"
          >
            {submitting ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-500">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
