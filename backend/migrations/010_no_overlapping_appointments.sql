-- 1. Enable the btree_gist extension (needed for mixing UUID + range in EXCLUDE)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. Add the exclusion constraint
ALTER TABLE appointments
ADD CONSTRAINT no_overlapping_appointments
EXCLUDE USING gist (
  doctor_id WITH =,
  tsrange(start_time, end_time, '[)') WITH &&
) WHERE (status != 'cancelled');