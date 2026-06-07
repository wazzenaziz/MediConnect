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
    // Mirror of `password`; the client sends it and we re-check equality
    // server-side so a tampered/bypassed client can't slip a mismatch through.
    confirm_password: z.string(),
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
  .strict()
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

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

// ============================================================
// FORGOT PASSWORD schema
// ============================================================
// Used by POST /api/auth/forgot-password
//
// Only the email is needed to trigger a reset email. We intentionally
// keep this minimal — the endpoint always responds the same way whether
// or not the email exists, so we don't leak which addresses are registered.
const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email format").toLowerCase().trim(),
});

// ============================================================
// RESET PASSWORD schema
// ============================================================
// Used by POST /api/auth/reset-password
//
// `access_token` is the short-lived recovery token Supabase put in the
// reset link (delivered to the frontend in the URL hash). `password` is
// the new password and must clear the same strength bar as registration
// (8–72 chars; 72 is bcrypt's input ceiling, which Supabase uses).
const resetPasswordSchema = z.object({
  access_token: z.string().min(1, "Reset token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password cannot exceed 72 characters"),
});

// ============================================================
// GOOGLE SIGN-IN schema
// ============================================================
// Used by POST /api/auth/google
//
// `id_token` is the Google-issued ID token (a JWT) from Google Identity
// Services in the browser. `nonce` is optional — if the frontend generated
// one for the Google request, Supabase re-checks it against the token.
const googleSignInSchema = z.object({
  id_token: z.string().min(1, "Google ID token is required"),
  nonce: z.string().optional(),
});

// ============================================================
// CHANGE PASSWORD schema
// ============================================================
// Used by POST /api/auth/change-password (authenticated). Same strength
// bar as register/reset. Confirmation is checked client-side; here we just
// enforce the new password is valid.
const changePasswordSchema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password cannot exceed 72 characters"),
});

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  googleSignInSchema,
  changePasswordSchema,
};