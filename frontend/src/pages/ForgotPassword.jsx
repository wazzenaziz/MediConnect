import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { Button } from '../components/ui'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      // The backend always responds 200 with a generic message (it won't
      // reveal whether the email is registered), so a success here just means
      // "request accepted" — we show the same confirmation either way.
      await api.post('/auth/forgot-password', { email: email.trim() })
      setDone(true)
    } catch (err) {
      const status = err.response?.status
      if (status === 429) {
        setError('Too many attempts. Please try again in a few minutes.')
      } else {
        setError(
          err.response?.data?.message ||
            'Could not reach the server. Check your connection.',
        )
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
        <h1 className="mt-1 text-2xl font-bold text-ink-900">
          Reset your password
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Enter your email and we’ll send you a link to set a new password.
        </p>

        {done ? (
          <div
            role="status"
            className="mt-6 rounded-md border border-success-bd bg-success-bg px-3 py-3 text-sm text-success"
          >
            If an account exists for <strong>{email.trim()}</strong>, a reset
            link is on its way. The link expires in about an hour — check your
            inbox (and spam).
          </div>
        ) : (
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

            {error && (
              <div
                role="alert"
                className="rounded-md border border-danger-bd bg-danger-bg px-3 py-2 text-sm text-danger"
              >
                {error}
              </div>
            )}

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? 'Sending…' : 'Send reset link'}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-ink-500">
          Remembered it?{' '}
          <Link
            to="/login"
            className="font-medium text-brand-600 hover:text-brand-700"
          >
            Back to log in
          </Link>
        </p>
      </div>
    </div>
  )
}
