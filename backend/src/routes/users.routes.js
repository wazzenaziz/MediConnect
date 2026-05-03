const express = require("express");
const router = express.Router();

const {
        getAllPatients,
        getPatientById,
        createPatient,
        updatePatient,
        deletePatient
} = require("../controllers/users.controller");

router.get("/", getAllPatients);
router.post("/", createPatient);
router.get("/:id", getPatientById);
router.patch("/:id", updatePatient);
router.delete("/:id", deletePatient);

module.exports = router;