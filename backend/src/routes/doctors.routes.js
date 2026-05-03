const express = require("express");
const router = express.Router();

const {
    getAllDoctors,
    getDoctorById,
    createDoctor,
    updateDoctor,
    deleteDoctor
} = require("../controllers/doctors.controller");

router.get("/", getAllDoctors);
router.post("/", createDoctor);
router.get("/:id", getDoctorById);
router.patch("/:id", updateDoctor);
router.delete("/:id", deleteDoctor);

module.exports = router;