const express = require("express");
const router = express.Router();

const {
    getAllDoctors,
    getDoctorById,
    createDoctor
} = require("../controllers/doctors.controller");

router.get("/", getAllDoctors);
router.post("/", createDoctor);
router.get("/:id", getDoctorById);

module.exports = router;