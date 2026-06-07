const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const roleMiddleware = require("../middleware/role.middleware");
const { validate } = require("../middleware/validate.middleware");
const {
  createDoctorAccountSchema,
  updateTemplateSchema,
  previewTemplateSchema,
} = require("../schemas/admin.schemas");

const {
  getAdminStats,
  createDoctorAccount,
  listTemplates,
  getTemplate,
  updateTemplate,
  previewTemplateHandler,
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

// ---- Email templates (admin only) ----
router.get(
  "/templates",
  authMiddleware,
  roleMiddleware("admin"),
  listTemplates,
);
router.get(
  "/templates/:key",
  authMiddleware,
  roleMiddleware("admin"),
  getTemplate,
);
router.put(
  "/templates/:key",
  authMiddleware,
  roleMiddleware("admin"),
  validate(updateTemplateSchema),
  updateTemplate,
);
router.post(
  "/templates/:key/preview",
  authMiddleware,
  roleMiddleware("admin"),
  validate(previewTemplateSchema),
  previewTemplateHandler,
);

module.exports = router;
