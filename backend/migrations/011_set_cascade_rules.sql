-- Migration: 011_set_cascade_rules
-- Purpose: Make ON DELETE behavior explicit and intent-driven for every
-- foreign key. Replaces the default NO ACTION with either CASCADE or
-- RESTRICT depending on the relationship.
--
-- Design rationale:
--   - CASCADE for relationships where the child is meaningless without
--     the parent (schedules without a doctor, doctor profile without
--     user account, notes without their appointment).
--   - RESTRICT for relationships where the child represents historical
--     medical evidence that must survive parent deletion (appointments
--     and notes referencing doctors or patients).
--
-- Note: Postgres does not allow modifying an existing FK's delete rule
-- in place. Each constraint must be dropped and recreated.

-- ============================================================
-- schedules.doctor_id → doctors  (NO ACTION → CASCADE)
-- ============================================================
ALTER TABLE schedules
  DROP CONSTRAINT schedules_doctor_id_fkey;

ALTER TABLE schedules
  ADD CONSTRAINT schedules_doctor_id_fkey
  FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE;

-- ============================================================
-- appointments.doctor_id → doctors  (NO ACTION → RESTRICT)
-- ============================================================
ALTER TABLE appointments
  DROP CONSTRAINT appointments_doctor_id_fkey;

ALTER TABLE appointments
  ADD CONSTRAINT appointments_doctor_id_fkey
  FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE RESTRICT;

-- ============================================================
-- appointments.patient_id → users  (NO ACTION → RESTRICT)
-- ============================================================
ALTER TABLE appointments
  DROP CONSTRAINT appointments_patient_id_fkey;

ALTER TABLE appointments
  ADD CONSTRAINT appointments_patient_id_fkey
  FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE RESTRICT;

-- ============================================================
-- doctors.user_id → users  (NO ACTION → CASCADE)
-- ============================================================
ALTER TABLE doctors
  DROP CONSTRAINT doctors_user_id_fkey;

ALTER TABLE doctors
  ADD CONSTRAINT doctors_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================================
-- notes.appointment_id → appointments  (NO ACTION → CASCADE)
-- ============================================================
ALTER TABLE notes
  DROP CONSTRAINT notes_appointment_id_fkey;

ALTER TABLE notes
  ADD CONSTRAINT notes_appointment_id_fkey
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE;

-- ============================================================
-- notes.doctor_id → doctors  (NO ACTION → RESTRICT)
-- ============================================================
ALTER TABLE notes
  DROP CONSTRAINT notes_doctor_id_fkey;

ALTER TABLE notes
  ADD CONSTRAINT notes_doctor_id_fkey
  FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE RESTRICT;

-- ============================================================
-- notes.patient_id → users  (NO ACTION → RESTRICT)
-- ============================================================
ALTER TABLE notes
  DROP CONSTRAINT notes_patient_id_fkey;

ALTER TABLE notes
  ADD CONSTRAINT notes_patient_id_fkey
  FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE RESTRICT;

-- ============================================================
-- users.id → auth.users  (NO ACTION → CASCADE)
-- ============================================================
ALTER TABLE users
  DROP CONSTRAINT users_id_fkey;

ALTER TABLE users
  ADD CONSTRAINT users_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;