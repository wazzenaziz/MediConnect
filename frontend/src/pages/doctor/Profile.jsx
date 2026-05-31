import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
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

function validate({ specialty, clinic_address, bio, latitude, longitude }) {
  if (!specialty || specialty.trim().length < 2)
    return 'Specialty must be at least 2 characters.'
  if (!clinic_address || clinic_address.trim().length < 5)
    return 'Clinic address must be at least 5 characters.'
  if (clinic_address.trim().length > 300) return 'Clinic address is too long.'
  if (bio && bio.length > 1000) return 'Bio cannot exceed 1000 characters.'
  if (
    latitude !== '' &&
    (Number.isNaN(Number(latitude)) ||
      Number(latitude) < -90 ||
      Number(latitude) > 90)
  )
    return 'Latitude must be between -90 and 90.'
  if (
    longitude !== '' &&
    (Number.isNaN(Number(longitude)) ||
      Number(longitude) < -180 ||
      Number(longitude) > 180)
  )
    return 'Longitude must be between -180 and 180.'
  return null
}

export default function DoctorProfile() {
  const { user } = useAuth()
  const [doctor, setDoctor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({
    specialty: '',
    bio: '',
    clinic_address: '',
    latitude: '',
    longitude: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [submitSuccess, setSubmitSuccess] = useState(null)

  // Resolve the doctor's row by looking it up via the doctors list
  // (the only endpoint exposed for "doctor profile of the logged-in
  // user"). Same trick used by Schedule / Appointments / Notes.
  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    setLoading(true)
    api
      .get('/doctors')
      .then(({ data }) => {
        if (cancelled) return
        const row = (data.doctors || []).find((d) => d.user_id === user.id)
        if (!row) {
          setError('No doctor profile is linked to your account.')
          return
        }
        setDoctor(row)
        setForm({
          specialty: row.specialty || '',
          bio: row.bio || '',
          clinic_address: row.clinic_address || '',
          latitude: row.latitude ?? '',
          longitude: row.longitude ?? '',
        })
      })
      .catch((err) =>
        setError(
          err.response?.data?.message || 'Could not load your doctor profile.',
        ),
      )
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user?.id])

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitError(null)
    setSubmitSuccess(null)
    if (!doctor) return

    const clientError = validate(form)
    if (clientError) {
      setSubmitError(clientError)
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        specialty: form.specialty.trim(),
        clinic_address: form.clinic_address.trim(),
      }
      if (form.bio.trim()) payload.bio = form.bio.trim()
      if (form.latitude !== '' && form.latitude !== null)
        payload.latitude = Number(form.latitude)
      if (form.longitude !== '' && form.longitude !== null)
        payload.longitude = Number(form.longitude)

      const { data } = await api.patch(`/doctors/${doctor.id}`, payload)
      if (data.doctor) setDoctor(data.doctor)
      setSubmitSuccess('Profile saved. Patients will see the new details.')
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
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">
          Doctor
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          Profile and clinic
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          This is the public profile patients see when they search for you.
          Account fields (name, email) are managed by the administrator.
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
        doctor && (
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl bg-white p-6 shadow-sm"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Full name
                </label>
                <input
                  type="text"
                  value={user?.full_name || ''}
                  disabled
                  className="mt-1 block w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
                />
                <p className="mt-1 text-xs text-slate-400">Set by your admin.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="mt-1 block w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Managed by Supabase Auth.
                </p>
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="specialty"
                  className="block text-sm font-medium text-slate-700"
                >
                  Specialty
                </label>
                <select
                  id="specialty"
                  required
                  value={form.specialty}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, specialty: e.target.value }))
                  }
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
                >
                  {/* Keep an off-list value selectable so existing data
                      doesn't get silently overwritten. */}
                  {!SPECIALTIES.includes(form.specialty) && form.specialty && (
                    <option value={form.specialty}>{form.specialty}</option>
                  )}
                  {SPECIALTIES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <LocationPicker
                  accent="emerald"
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
                <label
                  htmlFor="bio"
                  className="block text-sm font-medium text-slate-700"
                >
                  Bio <span className="text-slate-400">(optional)</span>
                </label>
                <textarea
                  id="bio"
                  rows={4}
                  maxLength={1000}
                  value={form.bio}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, bio: e.target.value }))
                  }
                  placeholder="A short summary of your practice — experience, languages spoken, focus areas."
                  className="mt-1 block w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
                />
                <p className="mt-1 text-xs text-slate-400">
                  {form.bio.length}/1000
                </p>
              </div>
            </div>

            {submitError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {submitError}
              </div>
            )}
            {submitSuccess && (
              <div className="mt-4 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-700">
                ✓ {submitSuccess}
              </div>
            )}

            <div className="mt-6">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-teal-600 px-4 py-2.5 font-medium text-white shadow-sm hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        )
      )}
    </div>
  )
}
