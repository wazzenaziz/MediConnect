const express = require("express");
const router = express.Router();

const {
    getAllAppointments,
    getAppointmentById,
    getAppointmentsByDoctorId,
    getAppointmentsByPatientId,
    createAppointment,
    updateAppointmentStatus,
    cancelAppointment,
} = require("../controllers/appointments.controller");

router.get("/", getAllAppointments);
router.post("/", createAppointment);
router.get("/doctor/:doctorId", getAppointmentsByDoctorId);
router.get("/patient/:patientId", getAppointmentsByPatientId);
router.patch("/:id/status", updateAppointmentStatus);
router.patch("/:id/cancel", cancelAppointment);
router.get("/:id", getAppointmentById);

module.exports = router;