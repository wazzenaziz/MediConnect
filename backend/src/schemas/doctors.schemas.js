// backend/src/schemas/doctors.schemas.js

const { z } = require("zod");

// ============================================================
// CREATE DOCTOR schema
// ============================================================
// Used by POST /api/doctors
//
// Note: this endpoint is admin-only (the auth middleware enforces
// that). The user_id must reference a user whose role is already
// "doctor" — that check is in the controller, not the schema,
// because schemas don't talk to the DB.
const createDoctorSchema = z.object({
  user_id: z.string().uuid("user_id must be a valid UUID"),
  specialty: z
    .string()
    .min(2, "Specialty must be at least 2 characters")
    .max(100, "Specialty cannot exceed 100 characters")
    .trim(),
  bio: z.string().max(1000, "Bio cannot exceed 1000 characters").trim().optional(),
  clinic_address: z
    .string()
    .min(5, "Clinic address must be at least 5 characters")
    .max(300, "Clinic address cannot exceed 300 characters")
    .trim(),
  latitude: z
    .number()
    .min(-90, "Latitude must be between -90 and 90")
    .max(90, "Latitude must be between -90 and 90")
    .optional(),
  longitude: z
    .number()
    .min(-180, "Longitude must be between -180 and 180")
    .max(180, "Longitude must be between -180 and 180")
    .optional(),
});

// ============================================================
// UPDATE DOCTOR schema
// ============================================================
// Used by PUT /api/doctors/:id
//
// All fields optional — partial update. user_id intentionally NOT
// allowed here: once a doctor profile is created, the link to the
// user account is immutable.
const updateDoctorSchema = z.object({
  specialty: z.string().min(2).max(100).trim().optional(),
  bio: z.string().max(1000).trim().optional(),
  clinic_address: z.string().min(5).max(300).trim().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

module.exports = {
  createDoctorSchema,
  updateDoctorSchema,
};