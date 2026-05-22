-- ============================================================
-- 012_nearby_doctors.sql
-- ============================================================
-- Purpose:
--   1. Create the `nearby_doctors` RPC that returns doctors within
--      `radius_km` of (lat, lng), with optional specialty filter.
--      Uses the Haversine formula in pure SQL — no PostGIS needed.
--   2. Add a small btree index on (latitude, longitude) to speed up
--      the bounding-box prefilter.
--   3. Seed your existing `doc@gmail.com` doctor user with a Tunis
--      location + specialty so the map has at least one marker.
--
-- Safe to run multiple times: function is CREATE OR REPLACE, index
-- uses IF NOT EXISTS, seed uses ON CONFLICT DO UPDATE.
-- ============================================================


-- ------------------------------------------------------------
-- 1) The nearby_doctors RPC
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION nearby_doctors(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 25,
  specialty_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  specialty TEXT,
  bio TEXT,
  clinic_address TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  distance_km DOUBLE PRECISION
)
LANGUAGE sql
STABLE
AS $$
  WITH bbox AS (
    -- Rough bounding box: 1 degree latitude ≈ 111 km.
    -- This prefilter lets the planner skip rows obviously outside the
    -- radius before computing the more expensive Haversine.
    SELECT
      lat - (radius_km / 111.0)                              AS lat_min,
      lat + (radius_km / 111.0)                              AS lat_max,
      lng - (radius_km / (111.0 * COS(RADIANS(lat))))        AS lng_min,
      lng + (radius_km / (111.0 * COS(RADIANS(lat))))        AS lng_max
  )
  SELECT
    d.id,
    d.user_id,
    u.full_name,
    u.email,
    u.phone,
    d.specialty,
    d.bio,
    d.clinic_address,
    d.latitude,
    d.longitude,
    -- Haversine: great-circle distance in km. Earth radius ≈ 6371 km.
    (
      6371 * 2 * ASIN(
        SQRT(
          POWER(SIN(RADIANS(d.latitude::float8 - lat) / 2), 2) +
          COS(RADIANS(lat)) *
          COS(RADIANS(d.latitude::float8)) *
          POWER(SIN(RADIANS(d.longitude::float8 - lng) / 2), 2)
        )
      )
    ) AS distance_km
  FROM doctors d
  JOIN users   u ON u.id = d.user_id
  CROSS JOIN bbox b
  WHERE d.latitude  IS NOT NULL
    AND d.longitude IS NOT NULL
    AND d.latitude  BETWEEN b.lat_min AND b.lat_max
    AND d.longitude BETWEEN b.lng_min AND b.lng_max
    AND (specialty_filter IS NULL OR d.specialty = specialty_filter)
    AND (
      6371 * 2 * ASIN(
        SQRT(
          POWER(SIN(RADIANS(d.latitude::float8 - lat) / 2), 2) +
          COS(RADIANS(lat)) *
          COS(RADIANS(d.latitude::float8)) *
          POWER(SIN(RADIANS(d.longitude::float8 - lng) / 2), 2)
        )
      )
    ) <= radius_km
  ORDER BY distance_km ASC;
$$;


-- ------------------------------------------------------------
-- 2) Index to speed up the bounding-box prefilter
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS doctors_lat_lng_idx
  ON doctors (latitude, longitude);


-- ------------------------------------------------------------
-- 3) Seed your existing doctor user (doc@gmail.com) with a
--    Tunis center location + a specialty, so /api/doctors/nearby
--    returns at least one result for the demo.
-- ------------------------------------------------------------
INSERT INTO doctors (user_id, specialty, bio, clinic_address, latitude, longitude)
SELECT
  u.id,
  'Gastroenterologist',
  'Specialist in digestive system disorders. 10 years experience.',
  'Avenue Habib Bourguiba, Tunis Centre',
  36.8008,
  10.1856
FROM users u
WHERE u.email = 'doc@gmail.com'
ON CONFLICT (user_id) DO UPDATE
  SET specialty       = EXCLUDED.specialty,
      bio             = EXCLUDED.bio,
      clinic_address  = EXCLUDED.clinic_address,
      latitude        = EXCLUDED.latitude,
      longitude       = EXCLUDED.longitude;


-- ------------------------------------------------------------
-- 4) Sanity check — should return at least 1 row (Dr. doc)
--    with a distance close to 0 from Tunis center (36.8065, 10.1815)
-- ------------------------------------------------------------
SELECT
  full_name,
  specialty,
  clinic_address,
  ROUND(distance_km::numeric, 2) AS distance_km
FROM nearby_doctors(36.8065, 10.1815, 25);
