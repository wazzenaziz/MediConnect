// backend/src/schemas/appointments.schemas.js

const { z } = require("zod");

// ============================================================
// CREATE APPOINTMENT schema
// ============================================================
// Used by POST /api/appointments
//
// Rules:
//   - doctor_id: must be a UUID
//   - start_time, end_time: must be valid ISO datetime strings
//   - reason: optional, max 500 chars (protects DB from huge payloads)
//   - end_time must be strictly after start_time (cross-field rule)
const createAppointmentSchema = z
  .object({
    doctor_id: z.string().uuid("doctor_id must be a valid UUID"),
    start_time: z
      .string()
      .datetime({ message: "start_time must be ISO 8601 (e.g. 2026-06-01T10:00:00Z)" }),
    end_time: z
      .string()
      .datetime({ message: "end_time must be ISO 8601 (e.g. 2026-06-01T10:30:00Z)" }),
    reason: z
      .string()
      .max(500, "Reason cannot exceed 500 characters")
      .trim()
      .optional(),
  })
  .refine(
    (data) => new Date(data.end_time) > new Date(data.start_time),
    {
      message: "end_time must be after start_time",
      path: ["end_time"], // attaches the error to the end_time field
    }
  );

// ============================================================
// UPDATE APPOINTMENT STATUS schema
// ============================================================
// Used by PATCH /api/appointments/:id/status
//
// Only the status can be updated; we restrict to known values.
const updateAppointmentStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "completed", "cancelled"], {
    errorMap: () => ({
      message: "Status must be one of: pending, confirmed, completed, cancelled",
    }),
  }),
});

module.exports = {
  createAppointmentSchema,
  updateAppointmentStatusSchema,
};