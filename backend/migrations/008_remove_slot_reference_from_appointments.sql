ALTER TABLE appointments
DROP CONSTRAINT appointments_slot_id_fkey;

ALTER TABLE appointments
DROP CONSTRAINT appointments_slot_id_key;

ALTER TABLE appointments
DROP COLUMN slot_id;