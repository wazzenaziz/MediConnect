-- ============================================================
-- 013_drop_obsolete_unique_constraint.sql
-- ============================================================
-- Migration 009 added UNIQUE (doctor_id, start_time, end_time)
-- on appointments. Migration 010 then added a smarter EXCLUDE
-- constraint (no_overlapping_appointments) that ignores cancelled
-- rows. The older UNIQUE was never dropped, so it kept firing
-- on inserts that overlapped with a cancelled row's (doctor,
-- start, end) tuple — raising 23505 unique_violation and
-- preventing patients from re-booking a time that was previously
-- cancelled.
--
-- Drop the obsolete UNIQUE. The EXCLUDE constraint remains and
-- continues to prevent overlapping non-cancelled bookings at the
-- database level (concurrency-safe).
-- ============================================================

ALTER TABLE appointments
DROP CONSTRAINT IF EXISTS appointments_no_double_booking;
