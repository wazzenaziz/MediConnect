import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { useConfirm } from '../../context/ConfirmContext'
import LocationPicker from '../../components/LocationPicker'

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
    setSubmitting(true)
    try {
      const payload = {
        email: form.email.trim().toLowerCase(),
        password: form.password,
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
            Admin
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Doctors</h1>
          <p className="mt-1 text-sm text-slate-500">
            {doctors.length} doctor{doctors.length === 1 ? '' : 's'} on the
            platform.
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm((v) => !v)
            setSubmitError(null)
            setSubmitSuccess(null)
          }}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
        >
          {showForm ? 'Close form' : '+ Onboard new doctor'}
        </button>
      </div>

      {submitSuccess && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          ✓ {submitSuccess}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
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
              <input
                type="text"
                required
                minLength={8}
                value={form.password}
                onChange={(e) =>
                  setForm((f) => ({ ...f, password: e.target.value }))
                }
                placeholder="At least 8 characters"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
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
              disabled={submitting}
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
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          Loading doctors…
        </div>
      ) : doctors.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          No doctors yet. Onboard one above to get started.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Specialty</th>
                <th className="px-4 py-3 text-left">Clinic</th>
                <th className="px-4 py-3 text-left">Coordinates</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {doctors.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {d.specialty || '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {d.clinic_address || '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {d.latitude && d.longitude
                      ? `${Number(d.latitude).toFixed(4)}, ${Number(d.longitude).toFixed(4)}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(d)}
                      disabled={deletingId === d.id}
                      className="rounded-md border border-rose-200 bg-white px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                    >
                      {deletingId === d.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
