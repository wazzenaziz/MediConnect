import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api'

const TZ = 'Africa/Tunis'

function toISODate(date) {
  // YYYY-MM-DD in the local (Tunis) timezone — what the backend expects.
  return date.toLocaleDateString('en-CA', { timeZone: TZ })
}

function nextNDays(n) {
  const today = new Date()
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    return d
  })
}

function formatDayLabel(date) {
  return {
    weekday: date.toLocaleDateString('en-US', { weekday: 'short', timeZone: TZ }),
    day: date.toLocaleDateString('en-US', { day: 'numeric', timeZone: TZ }),
    month: date.toLocaleDateString('en-US', { month: 'short', timeZone: TZ }),
  }
}

function formatSlotTime(isoString) {
  // available-slots returns local-time strings like "2026-05-25T09:00:00".
  // We render "09:00" by string-parsing — avoids Date timezone surprises.
  const t = isoString.split('T')[1] || ''
  return t.slice(0, 5)
}

// Backend's createAppointmentSchema requires a strict ISO 8601 with Z suffix.
// The available-slots payload gives us a naive local-time string. We treat
// those as Africa/Tunis wall-clock times and convert to UTC for booking.
function localTunisToUtcISO(localString) {
  // localString example: "2026-05-25T09:00:00"
  // Africa/Tunis is UTC+1 year-round (no DST). 09:00 Tunis = 08:00 UTC.
  // To avoid hard-coding the offset, we use Intl to compute it.
  const fakeDate = new Date(localString + 'Z') // pretend it was UTC
  // Now find what time `fakeDate` would be displayed as in Tunis
  const tunisStr = fakeDate.toLocaleString('sv-SE', { timeZone: TZ })
  // tunisStr is like "2026-05-25 10:00:00" — the offset is the diff
  const tunisAsUtc = new Date(tunisStr.replace(' ', 'T') + 'Z')
  const offsetMs = tunisAsUtc - fakeDate
  // The real UTC instant is localString minus the offset.
  const realUtc = new Date(new Date(localString + 'Z').getTime() - offsetMs)
  return realUtc.toISOString()
}

export default function DoctorProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [doctor, setDoctor] = useState(null)
  const [doctorLoading, setDoctorLoading] = useState(true)
  const [doctorError, setDoctorError] = useState(null)

  const [days] = useState(() => nextNDays(14))
  // Initial selected date: ?date=YYYY-MM-DD from the URL (set by the
  // "Book again" link on a cancelled appointment) if it's still within
  // the 14-day window, else today.
  const [selectedDate, setSelectedDate] = useState(() => {
    const fromUrl = searchParams.get('date')
    if (fromUrl && /^\d{4}-\d{2}-\d{2}$/.test(fromUrl)) {
      const today = toISODate(new Date())
      const cutoff = toISODate(
        new Date(Date.now() + 13 * 24 * 60 * 60 * 1000),
      )
      if (fromUrl >= today && fromUrl <= cutoff) return fromUrl
    }
    return toISODate(new Date())
  })

  const [slots, setSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotsError, setSlotsError] = useState(null)

  const [bookingSlot, setBookingSlot] = useState(null)
  const [bookingError, setBookingError] = useState(null)
  const [bookingSuccess, setBookingSuccess] = useState(null)

  useEffect(() => {
    let cancelled = false
    setDoctorLoading(true)
    setDoctorError(null)
    api
      .get(`/doctors/${id}`)
      .then(({ data }) => {
        if (!cancelled) setDoctor(data.doctor)
      })
      .catch((err) => {
        if (!cancelled)
          setDoctorError(
            err.response?.data?.message || 'Could not load doctor profile.',
          )
      })
      .finally(() => {
        if (!cancelled) setDoctorLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    let cancelled = false
    setSlotsLoading(true)
    setSlotsError(null)
    setBookingSuccess(null)
    // Clear any lingering booking error so it doesn't follow the user
    // when they switch to a different date.
    setBookingError(null)
    api
      .get(`/appointments/available-slots/${id}`, {
        params: { date: selectedDate },
      })
      .then(({ data }) => {
        if (!cancelled) setSlots(data.availableSlots || [])
      })
      .catch((err) => {
        if (!cancelled) {
          const apiMsg = err.response?.data?.message
          const apiErr = err.response?.data?.error
          const detail = apiErr ? `${apiMsg} (${apiErr})` : apiMsg
          setSlotsError(
            detail || 'Could not load available slots for this day.',
          )
          setSlots([])
        }
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, selectedDate])

  async function handleBook(slot) {
    setBookingSlot(slot.start_time)
    setBookingError(null)
    setBookingSuccess(null)
    try {
      await api.post('/appointments', {
        doctor_id: id,
        start_time: localTunisToUtcISO(slot.start_time),
        end_time: localTunisToUtcISO(slot.end_time),
      })
      setBookingSuccess(
        `Appointment booked for ${formatSlotTime(slot.start_time)} on ${selectedDate}.`,
      )
      // Refresh slots so the booked one disappears from the list.
      setSlots((prev) => prev.filter((s) => s.start_time !== slot.start_time))
      setTimeout(() => navigate('/patient/appointments'), 1500)
    } catch (err) {
      const apiMsg = err.response?.data?.message
      const apiErr = err.response?.data?.error
      const validationMsg = err.response?.data?.errors?.[0]?.message
      const status = err.response?.status
      const detail =
        validationMsg ||
        (apiErr ? `${apiMsg} (${apiErr})` : apiMsg) ||
        `Booking failed (${status || 'network error'})`
      if (err.response?.status === 409) {
        setBookingError(
          `${detail || 'This slot was just booked.'} Refreshing available slots…`,
        )
        // Re-fetch so the picker reflects reality.
        setSelectedDate((d) => d)
        api
          .get(`/appointments/available-slots/${id}`, {
            params: { date: selectedDate },
          })
          .then(({ data }) => setSlots(data.availableSlots || []))
          .catch(() => {})
      } else {
        setBookingError(detail || 'Could not book this slot. Try another.')
      }
    } finally {
      setBookingSlot(null)
    }
  }

  const groupedSlots = useMemo(() => {
    const morning = []
    const afternoon = []
    const evening = []
    for (const s of slots) {
      const hour = Number((s.start_time.split('T')[1] || '00').slice(0, 2))
      if (hour < 12) morning.push(s)
      else if (hour < 17) afternoon.push(s)
      else evening.push(s)
    }
    return { morning, afternoon, evening }
  }, [slots])

  if (doctorLoading) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
        Loading doctor profile…
      </div>
    )
  }

  if (doctorError) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {doctorError}
        </div>
        <Link to="/patient/doctors" className="text-sm text-sky-600 hover:underline">
          ← Back to search
        </Link>
      </div>
    )
  }

  if (!doctor) return null

  return (
    <div className="space-y-6">
      <Link to="/patient/doctors" className="text-sm text-sky-600 hover:underline">
        ← Back to search
      </Link>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">
          {doctor.specialty}
        </p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">
          Dr. {doctor.full_name || 'Doctor'}
        </h1>
        {doctor.clinic_address && (
          <p className="mt-2 text-sm text-slate-600">📍 {doctor.clinic_address}</p>
        )}
        {doctor.bio && (
          <p className="mt-4 text-sm leading-relaxed text-slate-700">{doctor.bio}</p>
        )}
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Pick a time</h2>
        <p className="mt-1 text-sm text-slate-500">
          Available appointments for the next 14 days.
        </p>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
          {days.map((d) => {
            const iso = toISODate(d)
            const isSelected = iso === selectedDate
            const { weekday, day, month } = formatDayLabel(d)
            return (
              <button
                key={iso}
                onClick={() => setSelectedDate(iso)}
                className={`flex min-w-[72px] flex-col items-center rounded-xl border px-3 py-2 text-center transition ${
                  isSelected
                    ? 'border-sky-400 bg-sky-50 text-sky-700 ring-2 ring-sky-200'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50/40'
                }`}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wide">
                  {weekday}
                </span>
                <span className="mt-0.5 text-lg font-bold">{day}</span>
                <span className="text-[10px] text-slate-500">{month}</span>
              </button>
            )
          })}
        </div>

        {bookingSuccess && (
          <div
            role="status"
            className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
          >
            ✓ {bookingSuccess} Redirecting to your appointments…
          </div>
        )}

        {bookingError && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {bookingError}
          </div>
        )}

        {slotsError && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {slotsError}
          </div>
        )}

        {slotsLoading ? (
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            Loading slots…
          </div>
        ) : slots.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-6 text-center">
            <p className="text-sm font-medium text-slate-700">
              No slots available on this day.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Try another date — or the doctor may not work on this day yet.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {[
              ['Morning', groupedSlots.morning],
              ['Afternoon', groupedSlots.afternoon],
              ['Evening', groupedSlots.evening],
            ].map(([label, list]) =>
              list.length === 0 ? null : (
                <div key={label}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {label}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {list.map((s) => {
                      const isBooking = bookingSlot === s.start_time
                      return (
                        <button
                          key={s.start_time}
                          onClick={() => handleBook(s)}
                          disabled={!!bookingSlot}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isBooking ? 'Booking…' : formatSlotTime(s.start_time)}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </div>
    </div>
  )
}
