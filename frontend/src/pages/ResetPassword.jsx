import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { Button } from '../components/ui'
import PasswordField from '../components/PasswordField'

// Supabase delivers the recovery token in the URL hash, e.g.
//   /reset-password#access_token=...&type=recovery&expires_in=3600
// We parse it once on mount. If it's missing/wrong type, the link is bad.
function readRecoveryToken() {
  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash
  const params = new URLSearchParams(hash)
  const type = params.get('type')
  const token = params.get('access_token')
  // Some Supabase configs surface the error directly in the hash.
  const hashError = params.get('error_description') || params.get('error')
  if (hashError) return { token: null, error: hashError }
  if (!token || type !== 'recovery') return { token: null, error: null }
  return { token, error: null }
}

export default function ResetPassword() {
  const navigate = useNavigate()
  const [tokenState] = useState(readRecoveryToken)
  const [form, setForm] = useState({ password: '', confirm_password: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  // Strip the token out of the address bar so it isn't left in history.
  useEffect(() => {
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  const passwordsMismatch =
    form.confirm_password.length > 0 && form.password !== form.confirm_password
  const tooShort = form.password.length > 0 && form.password.length < 8
  const canSubmit =
    !submitting &&
    form.password.length >= 8 &&
    form.password === form.confirm_password

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (form.password !== form.confirm_password) {
      setError('Passwords do not match.')
      return
    }
    setSubmitting(true)
    try {
      await api.post('/auth/reset-password', {
        access_token: tokenState.token,
        password: form.password,
      })
      setDone(true)
      setTimeout(() => navigate('/login', { replace: true }), 2500)
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Could not reset password. The link may have expired — request a new one.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const linkInvalid = !tokenState.token

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
          MediConnect
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink-900">
          Set a new password
        </h1>

        {linkInvalid ? (
          <>
            <div
              role="alert"
              className="mt-6 rounded-md border border-danger-bd bg-danger-bg px-3 py-3 text-sm text-danger"
            >
              {tokenState.error ||
                'This reset link is invalid or has expired. Please request a new one.'}
            </div>
            <Link
              to="/forgot-password"
              className="mt-4 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              Request a new link
            </Link>
          </>
        ) : done ? (
          <div
            role="status"
            className="mt-6 rounded-md border border-success-bd bg-success-bg px-3 py-3 text-sm text-success"
          >
            Password updated. Redirecting you to log in…
          </div>
        ) : (
          <>
            <p className="mt-1 text-sm text-ink-500">
              Choose a strong password you haven’t used before.
            </p>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-ink-700"
                >
                  New password
                </label>
                <PasswordField
                  id="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={update('password')}
                  invalid={tooShort}
                  inputClassName={`mt-1 block w-full rounded-md border px-3 py-2.5 text-ink-900 ${
                    tooShort ? 'border-danger' : 'border-ink-300'
                  }`}
                  placeholder="At least 8 characters"
                />
                {tooShort && (
                  <p className="mt-1 text-xs text-danger">
                    Password must be at least 8 characters.
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="confirm_password"
                  className="block text-sm font-medium text-ink-700"
                >
                  Confirm new password
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
                  <p className="mt-1 text-xs text-danger">
                    Passwords do not match.
                  </p>
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

              <Button type="submit" disabled={!canSubmit} className="w-full">
                {submitting ? 'Updating…' : 'Update password'}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
