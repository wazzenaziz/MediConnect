// backend/src/schemas/users.schemas.js

const { z } = require("zod");

// ============================================================
// UPDATE PATIENT schema
// ============================================================
// Used by PUT /api/patients/:id
//
// Note: email is intentionally NOT included. Email is owned by
// auth.users (Supabase Auth). Allowing it here would desync the
// public.users.email and auth.users.email — a known issue you
// flagged in your audit. Removing it from the schema is the fix.
const updatePatientSchema = z.object({
  full_name: z.string().min(2).max(100).trim().optional(),
  phone: z
    .string()
    .regex(/^\+?[0-9]{8,15}$/, "Phone must be 8-15 digits, optional + prefix")
    .optional(),
});

module.exports = {
  updatePatientSchema,
};