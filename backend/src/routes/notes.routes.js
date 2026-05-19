const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const roleMiddleware = require("../middleware/role.middleware");
const { validate } = require("../middleware/validate.middleware");
const { createNoteSchema, updateNoteSchema } = require("../schemas/notes.schemas");

const {
  createNote,
  getNoteById,
  getNotesByAppointmentId,
  getNotesByPatientId,
  updateNote,
  deleteNote,
} = require("../controllers/notes.controller");

router.post("/", authMiddleware, roleMiddleware("doctor", "admin"), validate(createNoteSchema), createNote);router.get("/appointment/:appointmentId", authMiddleware, getNotesByAppointmentId);
router.get("/patient/:patientId", authMiddleware, roleMiddleware("patient", "doctor", "admin"), getNotesByPatientId);
router.get("/:id", authMiddleware, getNoteById);
router.patch("/:id", authMiddleware, roleMiddleware("doctor", "admin"), validate(updateNoteSchema), updateNote);
router.delete("/:id", authMiddleware, roleMiddleware("doctor", "admin"), deleteNote);

module.exports = router;