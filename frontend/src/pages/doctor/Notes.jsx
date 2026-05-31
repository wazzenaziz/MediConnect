import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

const TZ = 'Africa/Tunis'

function asUtcDate(iso) {
  if (!iso) return null
  const s = /Z$|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : iso + 'Z'
  return new Date(s)
}

function formatLabel(iso) {
  const d = asUtcDate(iso)
  if (!d) return ''
  return d.toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  })
}

const BLANK_NOTE = {
  diagnosis: '',
  prescription: '',
  note_text: '',
  follow_up_date: '',
}

export default function DoctorNotes() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [doctorId, setDoctorId] = useState(null)
  const [completed, setCompleted] = useState([])
  const [patientsById, setPatientsById] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const selectedId = searchParams.get('appointment') || null
  const [existingNote, setExistingNote] = useState(null)
  const [noteLoading, setNoteLoading] = useState(false)
  const [form, setForm] = useState(BLANK_NOTE)
  const [submitting, setSubmitting] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saveSuccess, setSaveSuccess] = useState(null)

  // Resolve doctor profile id.
  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    api
      .get('/doctors')
      .then(({ data }) => {
        if (cancelled) return
        const row = (data.doctors || []).find((d) => d.user_id === user.id)
        if (row) setDoctorId(row.id)
        else setError('No doctor profile linked to your account.')
      })
      .catch((err) =>
        setError(
          err.response?.data?.message ||
            'Could not load your doctor profile.',
        ),
      )
    return () => {
      cancelled = true
    }
  }, [user?.id])

  // Load all completed appointments (notes are unlocked once an
  // appointment is marked completed).
  useEffect(() => {
    if (!doctorId) return
    let cancelled = false
    setLoading(true)
    api
      .get(`/appointments/doctor/${doctorId}`)
      .then(async ({ data }) => {
        if (cancelled) return
        const done = (data.appointments || []).filter(
          (a) => a.status === 'completed',
        )
        setCompleted(done)
        const patientIds = [...new Set(done.map((a) => a.patient_id))]
        const fetched = await Promise.all(
          patientIds.map((pid) =>
            api
              .get(`/patients/${pid}`)
              .then((r) => r.data.patient || r.data.user || null)
              .catch(() => null),
          ),
        )
        if (cancelled) return
        const map = {}
        for (const p of fetched) if (p) map[p.id] = p
        setPatientsById(map)
      })
      .catch((err) => {
        if (cancelled) return
        setError(
          err.response?.data?.message ||
            'Could not load completed appointments.',
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [doctorId])

  // When an appointment is selected, fetch its existing note (if any)
  // and pre-populate the form.
  const loadNote = useCallback(async () => {
    if (!selectedId) {
      setExistingNote(null)
      setForm(BLANK_NOTE)
      return
    }
    setNoteLoading(true)
    setSaveError(null)
    setSaveSuccess(null)
    try {
      const { data } = await api.get(`/notes/appointment/${selectedId}`)
      // Backend usually returns either an array or a single note. Handle both.
      const note = Array.isArray(data.notes)
        ? data.notes[0]
        : data.note || null
      setExistingNote(note || null)
      if (note) {
        setForm({
          diagnosis: note.diagnosis || '',
          prescription: note.prescription || '',
          note_text: note.note_text || '',
          follow_up_date: note.follow_up_date
            ? note.follow_up_date.slice(0, 10)
            : '',
        })
      } else {
        setForm(BLANK_NOTE)
      }
    } catch (err) {
      // 404 just means "no note yet" — fall through to blank form.
      if (err.response?.status !== 404) {
        setSaveError(
          err.response?.data?.message || 'Could not load the existing note.',
        )
      }
      setExistingNote(null)
      setForm(BLANK_NOTE)
    } finally {
      setNoteLoading(false)
    }
  }, [selectedId])

  useEffect(() => {
    loadNote()
  }, [loadNote])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!selectedId) return
    if (!form.diagnosis && !form.prescription && !form.note_text) {
      setSaveError(
        'Add at least one of diagnosis, prescription, or note text.',
      )
      return
    }
    setSubmitting(true)
    setSaveError(null)
    setSaveSuccess(null)
    try {
      const payload = {
        diagnosis: form.diagnosis || undefined,
        prescription: form.prescription || undefined,
        note_text: form.note_text || undefined,
        follow_up_date: form.follow_up_date || undefined,
      }
      if (existingNote) {
        await api.patch(`/notes/${existingNote.id}`, payload)
        setSaveSuccess('Note updated.')
      } else {
        await api.post('/notes', { appointment_id: selectedId, ...payload })
        setSaveSuccess('Note saved.')
      }
      loadNote()
    } catch (err) {
      setSaveError(
        err.response?.data?.message ||
          err.response?.data?.errors?.[0]?.message ||
          'Could not save the note.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  function selectAppointment(id) {
    const next = new URLSearchParams(searchParams)
    if (id) next.set('appointment', id)
    else next.delete('appointment')
    setSearchParams(next, { replace: true })
  }

  const sortedCompleted = useMemo(
    () =>
      [...completed].sort(
        (a, b) => asUtcDate(b.start_time) - asUtcDate(a.start_time),
      ),
    [completed],
  )

  const selectedAppt = useMemo(
    () => completed.find((a) => a.id === selectedId),
    [completed, selectedId],
  )

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">
          Doctor
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          Consultation notes
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Record diagnosis, prescription, and follow-up for completed
          appointments. The patient can view their own notes.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <aside className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Completed appointments
          </h2>
          {loading ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center text-sm text-slate-500">
              Loading…
            </div>
          ) : sortedCompleted.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center text-xs text-slate-500">
              No completed appointments yet. Mark a confirmed appointment
              as completed from the Appointments page to write a note.
            </div>
          ) : (
            sortedCompleted.map((a) => {
              const patient = patientsById[a.patient_id]
              const isSelected = a.id === selectedId
              return (
                <button
                  key={a.id}
                  onClick={() => selectAppointment(a.id)}
                  className={`w-full rounded-xl border p-3 text-left text-sm transition ${
                    isSelected
                      ? 'border-teal-400 bg-teal-50/50 ring-2 ring-teal-200'
                      : 'border-slate-200 bg-white hover:border-teal-300'
                  }`}
                >
                  <p className="font-medium text-slate-900">
                    {patient?.full_name ||
                      `Patient #${a.patient_id.slice(0, 8)}`}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {formatLabel(a.start_time)}
                  </p>
                </button>
              )
            })
          )}
        </aside>

        <section>
          {!selectedAppt ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
              Pick a completed appointment on the left to view or write its
              consultation note.
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">
                    Note for
                  </p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {patientsById[selectedAppt.patient_id]?.full_name ||
                      `Patient #${selectedAppt.patient_id.slice(0, 8)}`}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatLabel(selectedAppt.start_time)}
                  </p>
                </div>
                {existingNote && (
                  <span className="rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">
                    Editing existing note
                  </span>
                )}
              </div>

              {noteLoading && (
                <p className="mt-3 text-xs text-slate-500">Loading note…</p>
              )}

              <div className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600">
                    Diagnosis
                  </label>
                  <input
                    type="text"
                    maxLength={300}
                    value={form.diagnosis}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, diagnosis: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="e.g. Acute gastritis"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">
                    Prescription
                  </label>
                  <textarea
                    rows={3}
                    maxLength={1000}
                    value={form.prescription}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, prescription: e.target.value }))
                    }
                    className="mt-1 w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="One medication per line — name, dosage, duration"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">
                    Notes
                  </label>
                  <textarea
                    rows={4}
                    maxLength={2000}
                    value={form.note_text}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, note_text: e.target.value }))
                    }
                    className="mt-1 w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Observations, recommendations, lifestyle advice…"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">
                    Follow-up date <span className="text-slate-400">(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={form.follow_up_date}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        follow_up_date: e.target.value,
                      }))
                    }
                    className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {saveError && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {saveError}
                </div>
              )}
              {saveSuccess && (
                <div className="mt-4 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-700">
                  ✓ {saveSuccess}
                </div>
              )}

              <div className="mt-5">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
                >
                  {submitting
                    ? 'Saving…'
                    : existingNote
                      ? 'Update note'
                      : 'Save note'}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  )
}
