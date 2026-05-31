import { useEffect, useMemo, useState } from 'react'
import { api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useConfirm } from '../../context/ConfirmContext'

const DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

const DAY_LABELS = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
}

const BLANK_FORM = {
  // create mode picks one or more days at once; edit mode holds exactly one
  days: ['monday'],
  start_time: '09:00',
  end_time: '17:00',
  pause_start: '12:00',
  pause_end: '13:00',
  slot_duration: 30,
  valid_from: '',
  valid_to: '',
}

function toTimeInput(t) {
  // Backend returns "09:00:00" — html input[type=time] wants "09:00".
  return (t || '').slice(0, 5)
}

function toDateInput(d) {
  // Backend may return null or full ISO — we only want YYYY-MM-DD.
  if (!d) return ''
  return d.slice(0, 10)
}

export default function Schedule() {
  const { user } = useAuth()
  const confirm = useConfirm()
  const [doctorId, setDoctorId] = useState(null)
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(BLANK_FORM)
  const [editingId, setEditingId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState(null)

  // Resolve the logged-in doctor's `doctors.id` (FK target) once.
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

  async function loadSchedules(idOverride) {
    const did = idOverride || doctorId
    if (!did) return
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get(`/schedules/doctor/${did}`)
      setSchedules(data.schedules || [])
    } catch (err) {
      setError(
        err.response?.data?.message || 'Could not load your schedules.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (doctorId) loadSchedules()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId])

  function openCreate() {
    setEditingId(null)
    setForm(BLANK_FORM)
    setActionError(null)
    setShowForm(true)
  }

  function openEdit(s) {
    setEditingId(s.id)
    setForm({
      days: [s.day_of_week],
      start_time: toTimeInput(s.start_time),
      end_time: toTimeInput(s.end_time),
      pause_start: toTimeInput(s.pause_start) || '',
      pause_end: toTimeInput(s.pause_end) || '',
      slot_duration: s.slot_duration,
      valid_from: toDateInput(s.valid_from),
      valid_to: toDateInput(s.valid_to),
    })
    setActionError(null)
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.days.length === 0) {
      setActionError('Pick at least one day.')
      return
    }
    setSubmitting(true)
    setActionError(null)
    try {
      // Fields shared across every day being created/updated.
      const base = {
        start_time: form.start_time + ':00',
        end_time: form.end_time + ':00',
        slot_duration: Number(form.slot_duration),
      }
      if (form.pause_start && form.pause_end) {
        base.pause_start = form.pause_start + ':00'
        base.pause_end = form.pause_end + ':00'
      }
      if (form.valid_from) base.valid_from = form.valid_from
      if (form.valid_to) base.valid_to = form.valid_to

      if (editingId) {
        await api.patch(`/schedules/${editingId}`, {
          ...base,
          day_of_week: form.days[0],
        })
      } else {
        // One schedule row per selected day. Skip days that already exist
        // so the backend's per-day uniqueness doesn't reject the whole batch.
        const taken = new Set(schedules.map((s) => s.day_of_week))
        const toCreate = form.days.filter((d) => !taken.has(d))
        if (toCreate.length === 0) {
          setActionError('You already have a schedule for the selected day(s).')
          setSubmitting(false)
          return
        }
        await Promise.all(
          toCreate.map((d) =>
            api.post('/schedules', { ...base, day_of_week: d }),
          ),
        )
      }
      setShowForm(false)
      setForm(BLANK_FORM)
      setEditingId(null)
      loadSchedules()
    } catch (err) {
      const apiMsg = err.response?.data?.message
      const apiErr = err.response?.data?.error
      setActionError(apiErr ? `${apiMsg} (${apiErr})` : apiMsg || 'Save failed.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(s) {
    const ok = await confirm({
      title: `Delete ${s.day_of_week} schedule?`,
      description:
        'Patients won’t be able to book this day until you add a new schedule for it.',
      confirmLabel: 'Delete',
      cancelLabel: 'Keep',
      tone: 'danger',
    })
    if (!ok) return
    try {
      await api.delete(`/schedules/${s.id}`)
      setSchedules((prev) => prev.filter((x) => x.id !== s.id))
    } catch (err) {
      setActionError(
        err.response?.data?.message || 'Could not delete the schedule.',
      )
    }
  }

  const sortedSchedules = useMemo(
    () =>
      [...schedules].sort(
        (a, b) =>
          DAYS.indexOf(a.day_of_week) - DAYS.indexOf(b.day_of_week),
      ),
    [schedules],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">
            Doctor
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Weekly schedule
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Set the days and hours you see patients. Slot duration controls
            how long each appointment is.
          </p>
        </div>
        <button
          onClick={openCreate}
          disabled={!doctorId}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          + Add schedule
        </button>
      </div>

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
          className="rounded-2xl border border-teal-200 bg-teal-50/40 p-5 shadow-sm"
        >
          <h2 className="text-sm font-semibold text-slate-900">
            {editingId ? 'Edit schedule' : 'New schedule'}
          </h2>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600">
                {editingId ? 'Day of week' : 'Days you work'}
                {!editingId && (
                  <span className="ml-1 text-slate-400">
                    (pick one or more)
                  </span>
                )}
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {DAYS.map((d) => {
                  const selected = form.days.includes(d)
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() =>
                        setForm((f) => {
                          if (editingId) return { ...f, days: [d] }
                          const days = f.days.includes(d)
                            ? f.days.filter((x) => x !== d)
                            : [...f.days, d]
                          return { ...f, days }
                        })
                      }
                      className={
                        'rounded-full border px-4 py-1.5 text-sm font-medium transition ' +
                        (selected
                          ? 'border-teal-600 bg-teal-600 text-white'
                          : 'border-slate-300 bg-white text-slate-600 hover:border-teal-400 hover:text-teal-700')
                      }
                    >
                      {DAY_LABELS[d]}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600">
                Slot duration (min)
              </label>
              <input
                type="number"
                min={5}
                max={240}
                required
                value={form.slot_duration}
                onChange={(e) =>
                  setForm((f) => ({ ...f, slot_duration: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600">
                Start time
              </label>
              <input
                type="time"
                required
                value={form.start_time}
                onChange={(e) =>
                  setForm((f) => ({ ...f, start_time: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600">
                End time
              </label>
              <input
                type="time"
                required
                value={form.end_time}
                onChange={(e) =>
                  setForm((f) => ({ ...f, end_time: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600">
                Lunch start <span className="text-slate-400">(optional)</span>
              </label>
              <input
                type="time"
                value={form.pause_start}
                onChange={(e) =>
                  setForm((f) => ({ ...f, pause_start: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600">
                Lunch end <span className="text-slate-400">(optional)</span>
              </label>
              <input
                type="time"
                value={form.pause_end}
                onChange={(e) =>
                  setForm((f) => ({ ...f, pause_end: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600">
                Valid from
              </label>
              <input
                type="date"
                value={form.valid_from}
                onChange={(e) =>
                  setForm((f) => ({ ...f, valid_from: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600">
                Valid to
              </label>
              <input
                type="date"
                value={form.valid_to}
                onChange={(e) =>
                  setForm((f) => ({ ...f, valid_to: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="mt-5 flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {submitting ? 'Saving…' : editingId ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setEditingId(null)
                setActionError(null)
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
          Loading schedules…
        </div>
      ) : sortedSchedules.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm font-medium text-slate-700">
            You haven’t set any availability yet.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Add a schedule above so patients can start booking with you.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Day</th>
                <th className="px-4 py-3 text-left">Hours</th>
                <th className="px-4 py-3 text-left">Break</th>
                <th className="px-4 py-3 text-left">Slot</th>
                <th className="px-4 py-3 text-left">Valid</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedSchedules.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 font-medium capitalize text-slate-900">
                    {s.day_of_week}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {toTimeInput(s.start_time)} – {toTimeInput(s.end_time)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {s.pause_start && s.pause_end
                      ? `${toTimeInput(s.pause_start)} – ${toTimeInput(s.pause_end)}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {s.slot_duration} min
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {toDateInput(s.valid_from) || '—'} →{' '}
                    {toDateInput(s.valid_to) || '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(s)}
                      className="mr-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(s)}
                      className="rounded-md border border-rose-200 bg-white px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
                    >
                      Delete
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
