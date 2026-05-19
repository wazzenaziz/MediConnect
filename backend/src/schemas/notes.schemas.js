// backend/src/schemas/notes.schemas.js

const { z } = require("zod");

// ============================================================
// CREATE NOTE schema
// ============================================================
const createNoteSchema = z.object({
  appointment_id: z.string().uuid("appointment_id must be a valid UUID"),
  content: z
    .string()
    .min(1, "Note content cannot be empty")
    .max(5000, "Note content cannot exceed 5000 characters")
    .trim(),
});

// ============================================================
// UPDATE NOTE schema
// ============================================================
const updateNoteSchema = z.object({
  content: z
    .string()
    .min(1, "Note content cannot be empty")
    .max(5000, "Note content cannot exceed 5000 characters")
    .trim(),
});

module.exports = {
  createNoteSchema,
  updateNoteSchema,
};