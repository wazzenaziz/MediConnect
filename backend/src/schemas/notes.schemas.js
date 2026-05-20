// backend/src/schemas/notes.schemas.js

const { z } = require("zod");

// ============================================================
// CREATE NOTE schema
// ============================================================
// Used by POST /api/notes
//
// A note records medical observations linked to an appointment.
// At least one of diagnosis, prescription, or note_text must be
// present — an empty note has no clinical value.
const createNoteSchema = z
  .object({
    appointment_id: z.string().uuid("appointment_id must be a valid UUID"),
    diagnosis: z
      .string()
      .max(2000, "Diagnosis cannot exceed 2000 characters")
      .trim()
      .optional(),
    prescription: z
      .string()
      .max(5000, "Prescription cannot exceed 5000 characters")
      .trim()
      .optional(),
    note_text: z
      .string()
      .max(5000, "Note text cannot exceed 5000 characters")
      .trim()
      .optional(),
    follow_up_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "follow_up_date must be YYYY-MM-DD")
      .optional(),
  })
  .refine(
    (data) => data.diagnosis || data.prescription || data.note_text,
    {
      message: "At least one of diagnosis, prescription, or note_text is required",
      path: ["note_text"],
    }
  );

// ============================================================
// UPDATE NOTE schema
// ============================================================
// Used by PATCH /api/notes/:id
//
// All fields optional — partial update. We don't enforce the
// "at least one" rule here because an update with no fields is a
// no-op rather than a bad request.
const updateNoteSchema = z.object({
  diagnosis: z.string().max(2000).trim().optional(),
  prescription: z.string().max(5000).trim().optional(),
  note_text: z.string().max(5000).trim().optional(),
  follow_up_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "follow_up_date must be YYYY-MM-DD")
    .optional(),
});

module.exports = {
  createNoteSchema,
  updateNoteSchema,
};