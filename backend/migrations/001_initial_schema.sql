CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('patient', 'doctor', 'admin')),
  phone TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id),
  specialty TEXT NOT NULL,
  bio TEXT,
  clinic_address TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctors(id),
  day_of_week TEXT NOT NULL CHECK (
    day_of_week IN (
      'monday', 'tuesday', 'wednesday', 'thursday',
      'friday', 'saturday', 'sunday'
    )
  ),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  pause_start TIME,
  pause_end TIME,
  slot_duration INT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),

  CHECK (end_time > start_time),
  CHECK (
    pause_start IS NULL 
    OR pause_end IS NULL 
    OR (
      pause_end > pause_start
      AND pause_start >= start_time
      AND pause_end <= end_time
    )
  ),
  CHECK (slot_duration > 0),
  UNIQUE (doctor_id, day_of_week, valid_from, valid_to)
);

CREATE TABLE slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctors(id),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('booked', 'cancelled')),
  created_at TIMESTAMP DEFAULT NOW(),

  CHECK (end_time > start_time),
  UNIQUE (doctor_id, start_time, end_time)
);

CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctors(id),
  patient_id UUID NOT NULL REFERENCES users(id),
  slot_id UUID NOT NULL UNIQUE REFERENCES slots(id),
  status TEXT NOT NULL CHECK (
    status IN ('pending', 'confirmed', 'cancelled', 'completed')
  ),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL UNIQUE REFERENCES appointments(id),
  doctor_id UUID NOT NULL REFERENCES doctors(id),
  patient_id UUID NOT NULL REFERENCES users(id),
  diagnosis TEXT,
  prescription TEXT,
  note_text TEXT,
  follow_up_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
