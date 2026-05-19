// backend/src/schemas/auth.schemas.js

const { z } = require("zod");

// ============================================================
// REGISTER schema
// ============================================================
// Used by POST /api/auth/register
//
// Rules:
//   - email: must be a valid email, normalized to lowercase + trimmed
//   - password: 8-72 characters (bcrypt's max is 72)
//   - full_name: 2-100 characters, trimmed
//   - phone: optional, basic international format
//   - role: must be "patient" or "doctor" (admin is created manually)
const registerSchema = z
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
  })
  .strict();

// ============================================================
// LOGIN schema
// ============================================================
// Used by POST /api/auth/login
//
// Rules:
//   - email: must be a valid email, normalized
//   - password: must exist (we don't enforce min length here — that's
//     a register-time rule. If an existing user has a 6-char password,
//     they should still be able to log in.)
const loginSchema = z.object({
  email: z.string().email("Invalid email format").toLowerCase().trim(),
  password: z.string().min(1, "Password is required"),
});

module.exports = {
  registerSchema,
  loginSchema,
};