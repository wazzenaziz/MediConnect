import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { api } from '../../lib/api'

// Leaflet's default marker icons reference assets that Vite mangles
// during bundling. Re-point them to the CDN copies so markers render.
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

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

const TUNIS_CENTER = { lat: 36.8065, lng: 10.1815 }

// Child component: react-leaflet doesn't reactively update center on
// <MapContainer> after mount. This hooks into the map instance and
// re-pans whenever our center/zoom state changes.
function MapPanner({ center, zoom }) {
  const map = useMap()
  useEffect(() => {
    map.setView([center.lat, center.lng], zoom, { animate: true })
  }, [center.lat, center.lng, zoom, map])
  return null
}

export default function Doctors() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [location, setLocation] = useState(TUNIS_CENTER)
  const [usingMyLocation, setUsingMyLocation] = useState(false)
  const [radiusKm, setRadiusKm] = useState(25)
  const [specialty, setSpecialty] = useState(
    searchParams.get('specialty') || '',
  )

  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [geoError, setGeoError] = useState(null)

  // Keep ?specialty= in the URL in sync with the dropdown so the triage
  // → doctor search deep link survives a refresh.
  useEffect(() => {
    const params = new URLSearchParams(searchParams)
    if (specialty) params.set('specialty', specialty)
    else params.delete('specialty')
    setSearchParams(params, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specialty])

  function requestMyLocation() {
    setGeoError(null)
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setUsingMyLocation(true)
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError(
            'Location permission denied. Showing Tunis center instead.',
          )
        } else {
          setGeoError('Could not get your location. Showing Tunis center.')
        }
      },
      { timeout: 10000, maximumAge: 60000 },
    )
  }

  function useDefaultLocation() {
    setLocation(TUNIS_CENTER)
    setUsingMyLocation(false)
    setGeoError(null)
  }

  async function fetchDoctors() {
    setLoading(true)
    setError(null)
    try {
      const params = {
        lat: location.lat,
        lng: location.lng,
        radius_km: radiusKm,
      }
      if (specialty) params.specialty = specialty

      const { data } = await api.get('/doctors/nearby', { params })
      setDoctors(data.doctors || [])
      if ((data.doctors || []).length > 0) {
        setSelectedId(data.doctors[0].id)
      } else {
        setSelectedId(null)
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Could not load nearby doctors. Try again.',
      )
      setDoctors([])
    } finally {
      setLoading(false)
    }
  }

  // Fetch whenever location, radius, or specialty changes.
  useEffect(() => {
    fetchDoctors()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.lat, location.lng, radiusKm, specialty])

  // Center map on the selected doctor, otherwise on the user/Tunis location.
  const mapCenter = useMemo(() => {
    if (selectedId) {
      const sel = doctors.find((d) => d.id === selectedId)
      if (sel) return { lat: Number(sel.latitude), lng: Number(sel.longitude) }
    }
    return location
  }, [selectedId, doctors, location])

  // Tighter zoom for small radii, wider for large ones.
  const zoom = radiusKm <= 5 ? 14 : radiusKm <= 15 ? 13 : radiusKm <= 30 ? 12 : 11

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">
            Patient
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Find a doctor near you
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {usingMyLocation
              ? 'Showing doctors near your current location.'
              : 'Showing doctors near Tunis center.'}
          </p>
        </div>
        <div className="flex gap-2">
          {!usingMyLocation ? (
            <button
              onClick={requestMyLocation}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              📍 Use my location
            </button>
          ) : (
            <button
              onClick={useDefaultLocation}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Reset location
            </button>
          )}
        </div>
      </div>

      {geoError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {geoError}
        </div>
      )}

      <div className="grid gap-3 rounded-2xl bg-white p-4 shadow-sm md:grid-cols-[1fr_1fr_auto]">
        <div>
          <label
            htmlFor="specialty"
            className="block text-xs font-medium text-slate-600"
          >
            Specialty
          </label>
          <select
            id="specialty"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
          >
            <option value="">All specialties</option>
            {SPECIALTIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="radius"
            className="block text-xs font-medium text-slate-600"
          >
            Within {radiusKm} km
          </label>
          <input
            id="radius"
            type="range"
            min={1}
            max={50}
            step={1}
            value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
            className="mt-2 w-full accent-sky-600"
          />
        </div>

        <div className="flex items-end">
          <span className="rounded-lg bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700">
            {loading ? 'Loading…' : `${doctors.length} found`}
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="space-y-3">
          {loading && doctors.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              Loading doctors…
            </div>
          )}

          {!loading && doctors.length === 0 && !error && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <p className="text-sm font-medium text-slate-700">
                No doctors found in this area.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Try widening the radius or clearing the specialty filter.
              </p>
            </div>
          )}

          {doctors.map((d) => {
            const isSelected = d.id === selectedId
            return (
              <button
                key={d.id}
                onClick={() => setSelectedId(d.id)}
                className={`w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:border-sky-300 ${
                  isSelected
                    ? 'border-sky-400 ring-2 ring-sky-200'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">
                      Dr. {d.full_name}
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-sky-700">
                      {d.specialty}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {d.distance_km < 1
                      ? `${Math.round(d.distance_km * 1000)} m`
                      : `${d.distance_km.toFixed(1)} km`}
                  </span>
                </div>
                {d.clinic_address && (
                  <p className="mt-2 text-xs text-slate-500">
                    📍 {d.clinic_address}
                  </p>
                )}
                {d.bio && (
                  <p className="mt-2 line-clamp-2 text-xs text-slate-600">
                    {d.bio}
                  </p>
                )}
                <Link
                  to={`/patient/doctors/${d.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-3 inline-block text-xs font-medium text-sky-600 hover:text-sky-700"
                >
                  View available slots →
                </Link>
              </button>
            )
          })}
        </div>

        <div className="overflow-hidden rounded-2xl shadow-sm">
          <MapContainer
            center={[location.lat, location.lng]}
            zoom={zoom}
            style={{ height: '500px', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapPanner center={mapCenter} zoom={zoom} />

            <Circle
              center={[location.lat, location.lng]}
              radius={radiusKm * 1000}
              pathOptions={{
                color: '#0284c7',
                fillColor: '#0ea5e9',
                fillOpacity: 0.08,
                weight: 1,
              }}
            />

            {doctors.map((d) => (
              <Marker
                key={d.id}
                position={[Number(d.latitude), Number(d.longitude)]}
                eventHandlers={{
                  click: () => setSelectedId(d.id),
                }}
              >
                <Popup>
                  <div className="space-y-1">
                    <p className="font-semibold">Dr. {d.full_name}</p>
                    <p className="text-xs text-sky-700">{d.specialty}</p>
                    {d.clinic_address && (
                      <p className="text-xs text-slate-600">
                        {d.clinic_address}
                      </p>
                    )}
                    <p className="text-xs text-slate-500">
                      {d.distance_km < 1
                        ? `${Math.round(d.distance_km * 1000)} m away`
                        : `${d.distance_km.toFixed(1)} km away`}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  )
}
