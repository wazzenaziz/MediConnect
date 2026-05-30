const { z } = require("zod");

// ============================================================
// CREATE DOCTOR ACCOUNT (admin only)
// ============================================================
// Used by POST /api/admin/doctors.
//
// This is the two-step "create auth user + doctor profile" flow.
// We borrow the field rules from auth.schemas + doctors.schemas so
// the same constraints apply (password >= 8, valid email, etc.).
const createDoctorAccountSchema = z
  .object({
    email: z.string().email("Invalid email format").toLowerCase().trim(),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password cannot exceed 72 characters"),
    full_name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name cannot exceed 100 characters")
      .trim(),
    phone: z
      .string()
      .regex(/^\+?[0-9]{8,15}$/, "Phone must be 8-15 digits, optional + prefix")
      .optional(),
    specialty: z
      .string()
      .min(2, "Specialty must be at least 2 characters")
      .max(100, "Specialty cannot exceed 100 characters")
      .trim(),
    bio: z.string().max(1000).trim().optional(),
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
  })
  .strict();

module.exports = { createDoctorAccountSchema };
