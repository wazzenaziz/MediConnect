const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const roleMiddleware = require("../middleware/role.middleware");

const {
    getAllAppointments,
    getAppointmentById,
    getAppointmentsByDoctorId,
    getAppointmentsByPatientId,
    getAvailableSlots,
    createAppointment,
    updateAppointmentStatus,
    cancelAppointment,
} = require("../controllers/appointments.controller");

router.get("/", authMiddleware, roleMiddleware("admin"), getAllAppointments);
router.post("/", authMiddleware, roleMiddleware("patient"), createAppointment);
router.get("/available-slots/:doctorId", authMiddleware, getAvailableSlots);
router.get("/doctor/:doctorId", authMiddleware, roleMiddleware("doctor", "admin"), getAppointmentsByDoctorId);
router.get("/patient/:patientId", authMiddleware, roleMiddleware("patient", "admin"), getAppointmentsByPatientId);
router.patch("/:id/status", authMiddleware, roleMiddleware("doctor", "admin"), updateAppointmentStatus);
router.patch("/:id/cancel", authMiddleware, roleMiddleware("patient", "admin"), cancelAppointment);
router.get("/:id", authMiddleware, getAppointmentById);

module.exports = router;