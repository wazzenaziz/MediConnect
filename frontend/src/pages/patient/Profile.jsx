import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

const PHONE_RE = /^\+?[0-9]{8,15}$/

function validate({ full_name, phone }) {
  if (!full_name || full_name.trim().length < 2)
    return 'Full name must be at least 2 characters.'
  if (full_name.trim().length > 100) return 'Full name is too long.'
  if (phone && phone.trim() && !PHONE_RE.test(phone.trim()))
    return 'Phone must be 8–15 digits, with an optional + prefix.'
  return null
}

export default function PatientProfile() {
  const { user, login, token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({ full_name: '', phone: '' })
  const [originalEmail, setOriginalEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [submitSuccess, setSubmitSuccess] = useState(null)

  // Pull the latest version of the profile from the API so we render
  // the truth, not whatever's cached in localStorage from login.
  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    setLoading(true)
    api
      .get(`/patients/${user.id}`)
      .then(({ data }) => {
        if (cancelled) return
        const p = data.patient || data.user || {}
        setForm({
          full_name: p.full_name || user.full_name || '',
          phone: p.phone || '',
        })
        setOriginalEmail(p.email || user.email || '')
      })
      .catch((err) => {
        if (!cancelled)
          setError(
            err.response?.data?.message || 'Could not load your profile.',
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user?.id, user?.full_name, user?.email])

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitError(null)
    setSubmitSuccess(null)

    const clientError = validate(form)
    if (clientError) {
      setSubmitError(clientError)
      return
    }

    setSubmitting(true)
    try {
      const payload = { full_name: form.full_name.trim() }
      if (form.phone.trim()) payload.phone = form.phone.trim()

      const { data } = await api.patch(`/patients/${user.id}`, payload)
      const updated = data.patient || data.user || payload

      // Refresh the cached profile in AuthContext so the sidebar /
      // greeting reflect the new name immediately.
      login(
        {
          ...user,
          full_name: updated.full_name ?? payload.full_name,
          phone: updated.phone ?? payload.phone,
        },
        token,
      )

      setSubmitSuccess('Profile saved.')
    } catch (err) {
      const apiMsg = err.response?.data?.message
      const apiErr = err.response?.data?.error
      const fieldErr = err.response?.data?.errors?.[0]?.message
      setSubmitError(
        fieldErr ||
          (apiErr ? `${apiMsg} (${apiErr})` : apiMsg) ||
          'Could not save your profile.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">
          Patient
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          Account settings
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Update your name and contact phone. Your email is managed by your
          login provider and can’t be changed here.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          Loading your profile…
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-white p-6 shadow-sm"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={originalEmail}
                disabled
                className="mt-1 block w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
              />
              <p className="mt-1 text-xs text-slate-400">Managed by Supabase Auth.</p>
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="full_name"
                className="block text-sm font-medium text-slate-700"
              >
                Full name
              </label>
              <input
                id="full_name"
                type="text"
                required
                value={form.full_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, full_name: e.target.value }))
                }
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-slate-700"
              >
                Phone <span className="text-slate-400">(optional)</span>
              </label>
              <input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                placeholder="+216 12 345 678"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
            </div>
          </div>

          {submitError && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {submitError}
            </div>
          )}
          {submitSuccess && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              ✓ {submitSuccess}
            </div>
          )}

          <div className="mt-6">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-sky-600 px-4 py-2.5 font-medium text-white shadow-sm hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
