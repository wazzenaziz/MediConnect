const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const roleMiddleware = require("../middleware/role.middleware");
const { validate } = require("../middleware/validate.middleware");
const { createDoctorAccountSchema } = require("../schemas/admin.schemas");

const {
  getAdminStats,
  createDoctorAccount,
} = require("../controllers/admin.controller");

router.get("/stats", authMiddleware, roleMiddleware("admin"), getAdminStats);

// Admin-only atomic doctor onboarding (auth user + users row + doctors row).
router.post(
  "/doctors",
  authMiddleware,
  roleMiddleware("admin"),
  validate(createDoctorAccountSchema),
  createDoctorAccount,
);

module.exports = router;
