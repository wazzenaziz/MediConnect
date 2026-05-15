ALTER TABLE schedules
ADD CONSTRAINT schedules_valid_dates_check
CHECK (valid_to >= valid_from);