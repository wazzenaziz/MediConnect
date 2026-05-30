// Server-side proxy for OpenStreetMap Nominatim geocoding.
//
// Why proxy instead of calling Nominatim from the browser:
//   - Nominatim requires a descriptive User-Agent and rejects requests
//     without one. Browsers forbid setting User-Agent from fetch(), so
//     direct browser calls get blocked.
//   - Avoids any CORS ambiguity — the frontend just calls our own API.
//   - Lets us enforce the 1 req/sec usage policy and a sane timeout
//     centrally rather than trusting every client.

const NOMINATIM = "https://nominatim.openstreetmap.org";

// Nominatim's usage policy asks for an identifying UA with contact info.
const USER_AGENT =
  "MediConnect/1.0 (healthcare scheduling app; contact: admin@mediconnect.tn)";

async function nominatimFetch(path, params) {
  const url = new URL(`${NOMINATIM}${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept-Language": "en",
        Accept: "application/json",
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const err = new Error(`Nominatim ${res.status}`);
      err.detail = text.slice(0, 200);
      throw err;
    }
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * GET /api/geocode/search?q=...
 * Returns a trimmed list of address suggestions.
 */
const search = async (req, res) => {
  const q = (req.query.q || "").trim();
  if (q.length < 3) {
    return res.status(200).json({ results: [] });
  }
  try {
    const data = await nominatimFetch("/search", {
      q,
      format: "json",
      addressdetails: "1",
      limit: "6",
      // Bias toward Tunisia. Remove if MediConnect goes multi-country.
      countrycodes: "tn",
    });

    const results = (Array.isArray(data) ? data : []).map((r) => ({
      place_id: r.place_id,
      display_name: r.display_name,
      lat: Number(r.lat),
      lng: Number(r.lon),
    }));

    return res.status(200).json({ results });
  } catch (err) {
    return res.status(502).json({
      message: "Address search is temporarily unavailable.",
      error: err.message,
    });
  }
};

/**
 * GET /api/geocode/reverse?lat=..&lng=..
 * Returns a single human-readable address for the coordinates.
 */
const reverse = async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return res.status(400).json({ message: "lat and lng are required" });
  }
  try {
    const data = await nominatimFetch("/reverse", {
      lat: String(lat),
      lon: String(lng),
      format: "json",
      addressdetails: "1",
    });
    return res.status(200).json({
      display_name: data?.display_name || "",
      lat,
      lng,
    });
  } catch (err) {
    return res.status(502).json({
      message: "Reverse lookup is temporarily unavailable.",
      error: err.message,
    });
  }
};

module.exports = { search, reverse };
