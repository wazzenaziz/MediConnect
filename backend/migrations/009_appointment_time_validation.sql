ALTER TABLE appointments
ADD CONSTRAINT appointments_time_check
CHECK (end_time > start_time);

ALTER TABLE appointments
ADD CONSTRAINT appointments_no_double_booking
UNIQUE (doctor_id, start_time, end_time);