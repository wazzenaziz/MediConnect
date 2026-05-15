const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const roleMiddleware = require("../middleware/role.middleware");


const {
        getAllPatients,
        getPatientById,
        updatePatient,
        deletePatient
} = require("../controllers/users.controller");

router.get("/", authMiddleware, roleMiddleware("admin"), getAllPatients);
router.get("/:id", authMiddleware, roleMiddleware("admin", "patient"), getPatientById);
router.patch("/:id", authMiddleware, roleMiddleware("admin", "patient"), updatePatient);
router.delete("/:id", authMiddleware, roleMiddleware("admin"), deletePatient);

module.exports = router;