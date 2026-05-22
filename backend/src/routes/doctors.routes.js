const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const roleMiddleware = require("../middleware/role.middleware");
const { validate, validateQuery } = require("../middleware/validate.middleware");
const {
  createDoctorSchema,
  updateDoctorSchema,
  nearbyDoctorsSchema,
} = require("../schemas/doctors.schemas");


const {
    getAllDoctors,
    getDoctorById,
    getNearbyDoctors,
    createDoctor,
    updateDoctor,
    deleteDoctor
} = require("../controllers/doctors.controller");

router.get("/", authMiddleware, getAllDoctors);
// IMPORTANT: /nearby must be declared BEFORE /:id, otherwise Express
// matches "nearby" as the :id parameter and the request hits getDoctorById.
router.get("/nearby", authMiddleware, validateQuery(nearbyDoctorsSchema), getNearbyDoctors);
router.post("/", authMiddleware, roleMiddleware("admin"), validate(createDoctorSchema), createDoctor);
router.get("/:id", authMiddleware, getDoctorById);
router.patch("/:id", authMiddleware, roleMiddleware("admin", "doctor"), validate(updateDoctorSchema), updateDoctor);
router.delete("/:id", authMiddleware, roleMiddleware("admin"), deleteDoctor);

module.exports = router;
