ALTER TABLE schedules
ADD CONSTRAINT schedules_doctor_day_valid_range_unique
UNIQUE (doctor_id, day_of_week, valid_from, valid_to);