import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { api } from '../lib/api'

// Same icon fix as the patient search map — Vite mangles Leaflet's
// default marker URLs, so we point them at the CDN copies.
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const TUNIS_CENTER = [36.8065, 10.1815]

// A coordinate pair is "usable" only if it's a real number, in range,
// and not the (0,0) null-island default that bad seed data leaves.
function isUsableCoord(lat, lng) {
  const a = Number(lat)
  const b = Number(lng)
  if (Number.isNaN(a) || Number.isNaN(b)) return false
  if (a < -90 || a > 90 || b < -180 || b > 180) return false
  if (Math.abs(a) < 0.0001 && Math.abs(b) < 0.0001) return false // (0,0)
  return true
}

function normalizePosition(value) {
  if (value && isUsableCoord(value.lat, value.lng)) {
    return [Number(value.lat), Number(value.lng)]
  }
  return TUNIS_CENTER
}

// Click anywhere on the map to drop the pin there. Lives as a child of
// <MapContainer> so it can hook the map's click event. The pin then
// reverse-geocodes to fill the address — same path as a drag.
function ClickToPlace({ onPick }) {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng
      onPick([lat, lng])
    },
  })
  return null
}

// react-leaflet doesn't reactively update <MapContainer center> after
// mount. This child sees state changes and re-pans the map.
function MapPanner({ position, zoom }) {
  const map = useMap()
  useEffect(() => {
    if (!position) return
    map.setView(position, zoom, { animate: true })
  }, [position?.[0], position?.[1], zoom, map])
  return null
}

/**
 * Pick a clinic location with an address search + draggable pin.
 *
 * Address search and reverse-geocoding go through our own backend
 * (/api/geocode/*), which proxies OpenStreetMap Nominatim with a
 * proper User-Agent — browsers can't set that header, so a direct
 * browser→Nominatim call gets blocked.
 *
 * Props:
 *   value: { lat, lng, address? } | null
 *   onChange: ({ lat, lng, address }) => void
 *   accent: 'sky' | 'emerald' | 'violet'
 */
export default function LocationPicker({
  value,
  onChange,
  accent = 'emerald',
  addressLabel = 'Clinic location',
  required = true,
}) {
  const ring = {
    sky: 'focus:border-sky-500 focus:ring-sky-200',
    emerald: 'focus:border-emerald-500 focus:ring-emerald-200',
    violet: 'focus:border-violet-500 focus:ring-violet-200',
  }[accent]

  const [position, setPosition] = useState(() => normalizePosition(value))
  const [address, setAddress] = useState(value?.address || '')

  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const [showResults, setShowResults] = useState(false)
  const debounceRef = useRef(null)

  const [resolving, setResolving] = useState(false)
  const reverseSeqRef = useRef(0)

  // Keep internal state in sync if the parent resets `value`.
  useEffect(() => {
    if (value && isUsableCoord(value.lat, value.lng)) {
      const next = [Number(value.lat), Number(value.lng)]
      setPosition((cur) =>
        cur[0] === next[0] && cur[1] === next[1] ? cur : next,
      )
    }
    if (typeof value?.address === 'string') {
      setAddress((cur) => (cur === value.address ? cur : value.address))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.lat, value?.lng, value?.address])

  // Debounced address search via our backend proxy.
  useEffect(() => {
    if (!query || query.trim().length < 3) {
      setResults([])
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      setSearchError(null)
      try {
        const { data } = await api.get('/geocode/search', {
          params: { q: query },
        })
        setResults(data.results || [])
        setShowResults(true)
      } catch (err) {
        setSearchError(
          err.response?.data?.message || 'Address search failed.',
        )
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 450)
    return () => debounceRef.current && clearTimeout(debounceRef.current)
  }, [query])

  async function reverseGeocode([lat, lng]) {
    const mySeq = ++reverseSeqRef.current
    setResolving(true)
    try {
      const { data } = await api.get('/geocode/reverse', {
        params: { lat, lng },
      })
      if (mySeq !== reverseSeqRef.current) return
      const next = data?.display_name || ''
      setAddress(next)
      onChange?.({ lat, lng, address: next })
    } catch {
      // Best-effort — still report the coords even if naming failed.
      if (mySeq === reverseSeqRef.current) {
        onChange?.({ lat, lng, address })
      }
    } finally {
      if (mySeq === reverseSeqRef.current) setResolving(false)
    }
  }

  function pickResult(r) {
    if (!isUsableCoord(r.lat, r.lng)) return
    const lat = Number(r.lat)
    const lng = Number(r.lng)
    setPosition([lat, lng])
    setAddress(r.display_name)
    setQuery('')
    setResults([])
    setShowResults(false)
    onChange?.({ lat, lng, address: r.display_name })
  }

  // Shared by map-click and pin-drag: move the pin to a spot and resolve
  // its address. Click-to-place lets users pick the exact point with the
  // mouse instead of only dragging.
  function placePin([lat, lng]) {
    setPosition([lat, lng])
    reverseGeocode([lat, lng])
  }

  const markerEventHandlers = useMemo(
    () => ({
      dragend: (e) => {
        const { lat, lng } = e.target.getLatLng()
        placePin([lat, lng])
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">
        {addressLabel}
        {required && <span className="text-rose-500"> *</span>}
      </label>

      {/* z-[1000] lifts this wrapper (and its dropdown) above Leaflet's
          map panes, which create their own stacking context up to ~700.
          Without it the suggestions render behind the map below. */}
      <div className="relative z-[1000]">
        <input
          type="text"
          value={query || address}
          onChange={(e) => {
            setQuery(e.target.value)
            setAddress(e.target.value)
            onChange?.({
              lat: position[0],
              lng: position[1],
              address: e.target.value,
            })
          }}
          onFocus={() => setShowResults(results.length > 0)}
          onBlur={() => setTimeout(() => setShowResults(false), 150)}
          placeholder="Type an address, then pick from the list…"
          required={required}
          className={`block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 ${ring}`}
        />
        {(searching || resolving) && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
            {searching ? 'Searching…' : 'Resolving…'}
          </span>
        )}

        {showResults && results.length > 0 && (
          <ul className="absolute left-0 right-0 z-[1000] mt-1 max-h-60 overflow-auto rounded-lg border border-slate-200 bg-white shadow-xl">
            {results.map((r) => (
              <li key={r.place_id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickResult(r)}
                  className="block w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50"
                >
                  {r.display_name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {searchError && <p className="text-xs text-rose-600">{searchError}</p>}

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <MapContainer
          center={position}
          zoom={13}
          style={{ height: '300px', width: '100%' }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapPanner position={position} zoom={13} />
          <ClickToPlace onPick={placePin} />
          <Marker
            position={position}
            draggable
            eventHandlers={markerEventHandlers}
          />
        </MapContainer>
      </div>

      <p className="text-[11px] text-slate-500">
        Search for your clinic above, then click the map or drag the pin to
        the exact spot. Coordinates:{' '}
        <span className="font-mono">
          {position[0].toFixed(5)}, {position[1].toFixed(5)}
        </span>
      </p>
    </div>
  )
}
