const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const roleMiddleware = require("../middleware/role.middleware");
const { validate } = require("../middleware/validate.middleware");
const { createDoctorSchema, updateDoctorSchema } = require("../schemas/doctors.schemas");


const {
    getAllDoctors,
    getDoctorById,
    createDoctor,
    updateDoctor,
    deleteDoctor
} = require("../controllers/doctors.controller");

router.get("/", authMiddleware, getAllDoctors);
router.post("/", authMiddleware, roleMiddleware("admin"), validate(createDoctorSchema), createDoctor);
router.get("/:id", authMiddleware, getDoctorById);
router.patch("/:id", authMiddleware, roleMiddleware("admin", "doctor"), validate(updateDoctorSchema), updateDoctor);
router.delete("/:id", authMiddleware, roleMiddleware("admin"), deleteDoctor);

module.exports = router;