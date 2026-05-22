const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");

const authMiddleware = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validate.middleware");
const { triageSchema } = require("../schemas/triage.schemas");
const { triage } = require("../controllers/triage.controller");

const triageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  message: { message: "Too many triage requests. Try again in a minute." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/", authMiddleware, triageLimiter, validate(triageSchema), triage);

module.exports = router;
