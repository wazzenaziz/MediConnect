const { z } = require("zod");

const triageSchema = z
  .object({
    symptoms: z
      .string()
      .trim()
      .min(5, "Please describe your symptoms in at least 5 characters")
      .max(1000, "Symptoms description is too long (max 1000 characters)"),
  })
  .strict();

module.exports = { triageSchema };
