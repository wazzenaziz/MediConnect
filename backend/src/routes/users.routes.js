const express = require("express");
const router = express.Router();

const {
        getAllPatients,
        getPatientById,
        createPatient
} = require("../controllers/users.controller");

router.get("/", getAllPatients);
router.post("/", createPatient);
router.get("/:id", getPatientById);

module.exports = router;