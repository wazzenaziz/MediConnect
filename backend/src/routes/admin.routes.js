const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const roleMiddleware = require("../middleware/role.middleware");

const {
  getAdminStats,
} = require("../controllers/admin.controller");

router.get("/stats", authMiddleware, roleMiddleware("admin"), getAdminStats);

module.exports = router;