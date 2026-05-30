import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

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
const NOMINATIM = 'https://nominatim.openstreetmap.org'

// react-leaflet doesn't reactively update <MapContainer center> after
// mount. This child component sees state changes and re-pans the map.
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
 * Props:
 *   value: { lat: number, lng: number, address?: string } | null
 *   onChange: ({ lat, lng, address }) => void
 *   accent: 'sky' | 'emerald' | 'violet' (focus ring color)
 *
 * The picker is uncontrolled internally — it tracks search state and
 * the marker position — but every time the user picks an address or
 * drops a new pin, we call `onChange` with the new triple so the
 * parent form can persist it.
 */
export default function LocationPicker({
  value,
  onChange,
  accent = 'emerald',
  addressLabel = 'Clinic address',
  required = true,
}) {
  const ring = {
    sky: 'focus:border-sky-500 focus:ring-sky-200',
    emerald: 'focus:border-emerald-500 focus:ring-emerald-200',
    violet: 'focus:border-violet-500 focus:ring-violet-200',
  }[accent]

  // The current pin position. Falls back to Tunis if the parent has
  // no value yet (new doctor onboarding case).
  const [position, setPosition] = useState(() =>
    value?.lat != null && value?.lng != null
      ? [Number(value.lat), Number(value.lng)]
      : TUNIS_CENTER,
  )
  const [address, setAddress] = useState(value?.address || '')

  // Search dropdown state.
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const [showResults, setShowResults] = useState(false)
  const debounceRef = useRef(null)

  // Reverse-geocode the current pin when it moves via drag.
  const [resolving, setResolving] = useState(false)
  const reverseSeqRef = useRef(0)

  // When the parent updates `value` from outside (e.g. resetting the
  // form), keep our internal state in sync. We compare numerically
  // to avoid the loop a strict equality check would cause.
  useEffect(() => {
    const lat = value?.lat
    const lng = value?.lng
    if (lat == null || lng == null) return
    setPosition((cur) => {
      const next = [Number(lat), Number(lng)]
      if (cur[0] === next[0] && cur[1] === next[1]) return cur
      return next
    })
    if (typeof value?.address === 'string') {
      setAddress((cur) => (cur === value.address ? cur : value.address))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.lat, value?.lng, value?.address])

  // Debounced address search via Nominatim. They ask for at most 1
  // req/sec and a User-Agent — debouncing at 400ms keeps us polite.
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
        const url = new URL(`${NOMINATIM}/search`)
        url.searchParams.set('q', query)
        url.searchParams.set('format', 'json')
        url.searchParams.set('addressdetails', '1')
        url.searchParams.set('limit', '6')
        // Bias toward Tunisia — most of our doctors are there. Drop
        // this if MediConnect expands to other countries.
        url.searchParams.set('countrycodes', 'tn')
        const res = await fetch(url, {
          headers: { 'Accept-Language': 'en' },
        })
        if (!res.ok) throw new Error(`Search failed (${res.status})`)
        const data = await res.json()
        setResults(Array.isArray(data) ? data : [])
        setShowResults(true)
      } catch (err) {
        setSearchError(err.message || 'Search failed.')
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 400)
    return () => debounceRef.current && clearTimeout(debounceRef.current)
  }, [query])

  // Reverse-geocode the current pin position to find a human-readable
  // address. Called after pin drag. We tag each request with a
  // monotonically increasing seq so a slow earlier response doesn't
  // overwrite the address from a newer drag.
  async function reverseGeocode([lat, lng]) {
    const mySeq = ++reverseSeqRef.current
    setResolving(true)
    try {
      const url = new URL(`${NOMINATIM}/reverse`)
      url.searchParams.set('lat', String(lat))
      url.searchParams.set('lon', String(lng))
      url.searchParams.set('format', 'json')
      url.searchParams.set('addressdetails', '1')
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
      if (!res.ok) return
      const data = await res.json()
      if (mySeq !== reverseSeqRef.current) return // a newer drag superseded us
      const next = data?.display_name || ''
      setAddress(next)
      onChange?.({ lat, lng, address: next })
    } catch {
      // Reverse lookup is best-effort — silently swallow.
    } finally {
      if (mySeq === reverseSeqRef.current) setResolving(false)
    }
  }

  function pickResult(r) {
    const lat = Number(r.lat)
    const lng = Number(r.lon)
    if (Number.isNaN(lat) || Number.isNaN(lng)) return
    const next = r.display_name
    setPosition([lat, lng])
    setAddress(next)
    setQuery('')
    setResults([])
    setShowResults(false)
    onChange?.({ lat, lng, address: next })
  }

  // Stable marker handlers — recreated on every render is fine here
  // because Leaflet rebinds them via react-leaflet's reconciler.
  const markerEventHandlers = useMemo(
    () => ({
      dragend: (e) => {
        const { lat, lng } = e.target.getLatLng()
        setPosition([lat, lng])
        // Don't bubble the address-less change yet — reverseGeocode
        // will fire the proper onChange with both coords + address.
        reverseGeocode([lat, lng])
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

      <div className="relative">
        <input
          type="text"
          value={query || address}
          onChange={(e) => {
            // When the user starts typing, treat it as a new search.
            setQuery(e.target.value)
            // We keep `address` in sync so the picker still reports a
            // value to the parent if they submit without picking a
            // suggestion (manual entry is allowed).
            setAddress(e.target.value)
            onChange?.({
              lat: position[0],
              lng: position[1],
              address: e.target.value,
            })
          }}
          onFocus={() => setShowResults(results.length > 0)}
          onBlur={() => {
            // Delay so a click on a result item registers first.
            setTimeout(() => setShowResults(false), 120)
          }}
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
          <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
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

      {searchError && (
        <p className="text-xs text-rose-600">{searchError}</p>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <MapContainer
          center={position}
          zoom={14}
          style={{ height: '300px', width: '100%' }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{y}/{x}.png"
          />
          <MapPanner position={position} zoom={14} />
          <Marker
            position={position}
            draggable
            eventHandlers={markerEventHandlers}
          />
        </MapContainer>
      </div>

      <p className="text-[11px] text-slate-500">
        Drag the pin to fine-tune the exact clinic location. Coordinates:{' '}
        <span className="font-mono">
          {position[0].toFixed(5)}, {position[1].toFixed(5)}
        </span>
      </p>
    </div>
  )
}
