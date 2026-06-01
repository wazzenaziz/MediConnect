import { useEffect, useMemo, useState } from 'react'
import { api } from '../../lib/api'
import { useConfirm } from '../../context/ConfirmContext'
import LocationPicker from '../../components/LocationPicker'
import { Stethoscope, Search } from 'lucide-react'
import { Button, Person, Card, SkeletonRows, EmptyState } from '../../components/ui'
import PasswordField from '../../components/PasswordField'

const PAGE_SIZE = 25

const SPECIALTIES = [
  'General Practitioner',
  'Dermatologist',
  'Cardiologist',
  'Neurologist',
  'Gastroenterologist',
  'Pediatrician',
  'Gynecologist',
  'Orthopedist',
  'Ophthalmologist',
  'ENT Specialist',
  'Psychiatrist',
  'Urologist',
  'Endocrinologist',
  'Pulmonologist',
]

const BLANK_FORM = {
  email: '',
  password: '',
  confirm_password: '',
  full_name: '',
  phone: '',
  specialty: 'General Practitioner',
  bio: '',
  clinic_address: '',
  latitude: '',
  longitude: '',
}

export default function AdminDoctors() {
  const confirm = useConfirm()
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [query, setQuery] = useState('')
  const [specialtyFilter, setSpecialtyFilter] = useState('all')
  const [page, setPage] = useState(1)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(BLANK_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [submitSuccess, setSubmitSuccess] = useState(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get('/doctors')
      setDoctors(data.doctors || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load doctors.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleDelete(d) {
    const label = d.full_name || d.specialty || d.id.slice(0, 8)
    const ok = await confirm({
      title: `Delete doctor ${label}?`,
      description:
        'This permanently removes the doctor profile. Existing appointments and notes are kept for the record.',
      confirmLabel: 'Delete',
      cancelLabel: 'Keep',
      tone: 'danger',
    })
    if (!ok) return
    setDeletingId(d.id)
    setActionError(null)
    try {
      await api.delete(`/doctors/${d.id}`)
      setDoctors((prev) => prev.filter((x) => x.id !== d.id))
    } catch (err) {
      setActionError(
        err.response?.data?.message || 'Could not delete the doctor.',
      )
    } finally {
      setDeletingId(null)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitError(null)
    setSubmitSuccess(null)

    if (form.password !== form.confirm_password) {
      setSubmitError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        confirm_password: form.confirm_password,
        full_name: form.full_name.trim(),
        specialty: form.specialty,
        clinic_address: form.clinic_address.trim(),
      }
      if (form.phone.trim()) payload.phone = form.phone.trim()
      if (form.bio.trim()) payload.bio = form.bio.trim()
      if (form.latitude !== '') payload.latitude = Number(form.latitude)
      if (form.longitude !== '') payload.longitude = Number(form.longitude)

      await api.post('/admin/doctors', payload)
      setSubmitSuccess(`Doctor ${payload.full_name} created.`)
      setForm(BLANK_FORM)
      setShowForm(false)
      load()
    } catch (err) {
      const apiMsg = err.response?.data?.message
      const apiErr = err.response?.data?.error
      const fieldErr = err.response?.data?.errors?.[0]?.message
      setSubmitError(
        fieldErr ||
          (apiErr ? `${apiMsg} (${apiErr})` : apiMsg) ||
          'Could not create the doctor.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  // Filter by name/email/specialty + specialty dropdown, sort by name,
  // then paginate.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = doctors.filter((d) => {
      if (specialtyFilter !== 'all' && d.specialty !== specialtyFilter)
        return false
      if (!q) return true
      return (
        (d.full_name || '').toLowerCase().includes(q) ||
        (d.email || '').toLowerCase().includes(q) ||
        (d.specialty || '').toLowerCase().includes(q)
      )
    })
    return [...list].sort((a, b) =>
      (a.full_name || '').localeCompare(b.full_name || ''),
    )
  }, [doctors, query, specialtyFilter])

  // Live confirm-password check for the onboarding form — only flag once
  // the admin has started typing the confirmation.
  const passwordsMismatch =
    form.confirm_password.length > 0 && form.password !== form.confirm_password

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageRows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
            Admin
          </p>
          <h1 className="mt-1 text-2xl font-bold text-ink-900">Doctors</h1>
          <p className="mt-1 text-sm text-ink-500">
            {doctors.length} doctor{doctors.length === 1 ? '' : 's'} on the
            platform.
          </p>
        </div>
        <Button
          variant={showForm ? 'secondary' : 'primary'}
          onClick={() => {
            setShowForm((v) => !v)
            setSubmitError(null)
            setSubmitSuccess(null)
          }}
        >
          {showForm ? 'Close form' : '+ Onboard new doctor'}
        </Button>
      </div>

      {submitSuccess && (
        <div className="rounded-md border border-success-bd bg-success-bg px-3 py-2 text-sm text-success">
          {submitSuccess}
        </div>
      )}
      {error && (
        <div className="rounded-md border border-danger-bd bg-danger-bg px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}
      {actionError && (
        <div className="rounded-md border border-danger-bd bg-danger-bg px-3 py-2 text-sm text-danger">
          {actionError}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-violet-200 bg-violet-50/40 p-5 shadow-sm"
        >
          <h2 className="text-sm font-semibold text-slate-900">
            New doctor account
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Creates an auth account, user profile, and doctor profile in one
            step. The doctor can then log in immediately with the password
            you set here.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-600">
                Full name
              </label>
              <input
                type="text"
                required
                value={form.full_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, full_name: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">
                Specialty
              </label>
              <select
                value={form.specialty}
                onChange={(e) =>
                  setForm((f) => ({ ...f, specialty: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {SPECIALTIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">
                Email
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">
                Initial password
              </label>
              <PasswordField
                id="doctor_password"
                autoComplete="new-password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) =>
                  setForm((f) => ({ ...f, password: e.target.value }))
                }
                placeholder="At least 8 characters"
                inputClassName="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">
                Confirm password
              </label>
              <PasswordField
                id="doctor_confirm_password"
                autoComplete="new-password"
                required
                minLength={8}
                value={form.confirm_password}
                onChange={(e) =>
                  setForm((f) => ({ ...f, confirm_password: e.target.value }))
                }
                invalid={passwordsMismatch}
                placeholder="Re-enter the password"
                inputClassName={`mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm ${
                  passwordsMismatch ? 'border-red-400' : 'border-slate-300'
                }`}
              />
              {passwordsMismatch && (
                <p className="mt-1 text-xs text-red-600">
                  Passwords do not match.
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">
                Phone <span className="text-slate-400">(optional)</span>
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                placeholder="+216 …"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <LocationPicker
                accent="violet"
                addressLabel="Clinic location"
                value={{
                  lat: form.latitude !== '' ? Number(form.latitude) : null,
                  lng: form.longitude !== '' ? Number(form.longitude) : null,
                  address: form.clinic_address,
                }}
                onChange={({ lat, lng, address }) =>
                  setForm((f) => ({
                    ...f,
                    latitude: lat ?? '',
                    longitude: lng ?? '',
                    clinic_address: address ?? f.clinic_address,
                  }))
                }
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600">
                Bio <span className="text-slate-400">(optional)</span>
              </label>
              <textarea
                rows={3}
                maxLength={1000}
                value={form.bio}
                onChange={(e) =>
                  setForm((f) => ({ ...f, bio: e.target.value }))
                }
                className="mt-1 w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>
          </div>

          {submitError && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {submitError}
            </div>
          )}

          <div className="mt-5 flex gap-2">
            <button
              type="submit"
              disabled={submitting || passwordsMismatch}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
            >
              {submitting ? 'Creating…' : 'Create doctor account'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setSubmitError(null)
              }}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <Card className="p-6">
          <SkeletonRows rows={5} />
        </Card>
      ) : doctors.length === 0 ? (
        <EmptyState
          icon={<Stethoscope size={40} strokeWidth={1.5} />}
          title="No doctors yet"
          hint="Onboard your first doctor using the form above."
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative max-w-sm flex-1">
              <Search
                size={16}
                strokeWidth={1.8}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setPage(1)
                }}
                placeholder="Search by name, email, or specialty"
                className="w-full rounded-md border border-ink-300 py-2.5 pl-9 pr-3 text-sm text-ink-900"
              />
            </div>
            <select
              value={specialtyFilter}
              onChange={(e) => {
                setSpecialtyFilter(e.target.value)
                setPage(1)
              }}
              className="rounded-md border border-ink-300 px-3 py-2.5 text-sm text-ink-900"
            >
              <option value="all">All specialties</option>
              {SPECIALTIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<Search size={40} strokeWidth={1.5} />}
              title="No doctors match your filters"
              hint="Try a different search term or specialty."
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-card">
              <table className="min-w-full divide-y divide-ink-200 text-sm">
                <thead className="bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Doctor</th>
                    <th className="px-4 py-3 text-left">Specialty</th>
                    <th className="px-4 py-3 text-left">Clinic</th>
                    <th className="px-4 py-3 text-left">Coordinates</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-150">
                  {pageRows.map((d) => (
                    <tr key={d.id}>
                      <td className="px-4 py-3">
                        <Person
                          id={d.id}
                          name={d.full_name ? `Dr. ${d.full_name}` : undefined}
                          sub={d.email}
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-ink-900">
                        {d.specialty || '—'}
                      </td>
                      <td className="px-4 py-3 text-ink-700">
                        {d.clinic_address || '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-ink-500">
                        {d.latitude && d.longitude
                          ? `${Number(d.latitude).toFixed(4)}, ${Number(d.longitude).toFixed(4)}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(d)}
                          disabled={deletingId === d.id}
                        >
                          {deletingId === d.id ? 'Deleting…' : 'Delete'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pageCount > 1 && (
            <div className="flex items-center justify-between text-sm text-ink-600">
              <span>
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                {Math.min(currentPage * PAGE_SIZE, filtered.length)} of{' '}
                {filtered.length}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <span className="tabular-nums">
                  {currentPage} / {pageCount}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={currentPage >= pageCount}
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
