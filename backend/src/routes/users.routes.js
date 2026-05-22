const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const roleMiddleware = require("../middleware/role.middleware");
const { validate } = require("../middleware/validate.middleware");
const { updatePatientSchema } = require("../schemas/users.schemas");


const {
        getAllPatients,
        getPatientById,
        updatePatient,
        deletePatient
} = require("../controllers/users.controller");

router.get("/", authMiddleware, roleMiddleware("admin"), getAllPatients);
// Doctors can read patient profiles too — they need patient names on
// their appointments view and consultation-notes form. Read-only.
router.get("/:id", authMiddleware, roleMiddleware("admin", "patient", "doctor"), getPatientById);
router.patch("/:id", authMiddleware, roleMiddleware("admin", "patient"), validate(updatePatientSchema), updatePatient);
router.delete("/:id", authMiddleware, roleMiddleware("admin"), deletePatient);

module.exports = router;