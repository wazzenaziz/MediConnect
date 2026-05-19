// backend/src/schemas/schedules.schemas.js

const { z } = require("zod");

// HH:MM 24-hour format regex (used twice, defined once)
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

// ============================================================
// CREATE SCHEDULE schema
// ============================================================
// Used by POST /api/schedules
const createScheduleSchema = z
  .object({
    day_of_week: z.enum(
      ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
      {
        errorMap: () => ({ message: "day_of_week must be a lowercase weekday name" }),
      }
    ),
    start_time: z.string().regex(timeRegex, "start_time must be HH:MM (24h)"),
    end_time: z.string().regex(timeRegex, "end_time must be HH:MM (24h)"),
    pause_start: z
      .string()
      .regex(timeRegex, "pause_start must be HH:MM (24h)")
      .optional(),
    pause_end: z
      .string()
      .regex(timeRegex, "pause_end must be HH:MM (24h)")
      .optional(),
    slot_duration: z
      .number()
      .int("slot_duration must be a whole number of minutes")
      .min(5, "slot_duration must be at least 5 minutes")
      .max(240, "slot_duration cannot exceed 240 minutes"),
    valid_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "valid_from must be YYYY-MM-DD"),
    valid_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "valid_to must be YYYY-MM-DD"),
  })
  .refine((data) => data.end_time > data.start_time, {
    message: "end_time must be after start_time",
    path: ["end_time"],
  })
  .refine((data) => data.valid_to >= data.valid_from, {
    message: "valid_to must be on or after valid_from",
    path: ["valid_to"],
  })
  .refine(
    (data) => {
      // If a pause is set, BOTH pause_start and pause_end must be present
      const hasStart = data.pause_start !== undefined;
      const hasEnd = data.pause_end !== undefined;
      return hasStart === hasEnd;
    },
    {
      message: "pause_start and pause_end must be provided together",
      path: ["pause_end"],
    }
  )
  .refine(
    (data) => {
      // If pause exists, it must fall inside the working hours
      if (!data.pause_start || !data.pause_end) return true;
      return (
        data.pause_start >= data.start_time &&
        data.pause_end <= data.end_time &&
        data.pause_end > data.pause_start
      );
    },
    {
      message: "pause must be within working hours and pause_end after pause_start",
      path: ["pause_start"],
    }
  );

// ============================================================
// UPDATE SCHEDULE schema
// ============================================================
// Used by PUT /api/schedules/:id
// Same fields as create, but all optional. We re-validate cross-field
// rules only if BOTH involved fields are present in the update.
const updateScheduleSchema = z
  .object({
    day_of_week: z
      .enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"])
      .optional(),
    start_time: z.string().regex(timeRegex).optional(),
    end_time: z.string().regex(timeRegex).optional(),
    pause_start: z.string().regex(timeRegex).optional(),
    pause_end: z.string().regex(timeRegex).optional(),
    slot_duration: z.number().int().min(5).max(240).optional(),
    valid_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    valid_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })
  .refine(
    (data) => {
      if (data.start_time && data.end_time) {
        return data.end_time > data.start_time;
      }
      return true;
    },
    { message: "end_time must be after start_time", path: ["end_time"] }
  );

module.exports = {
  createScheduleSchema,
  updateScheduleSchema,
};