const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");

const authMiddleware = require("../middleware/auth.middleware");
const { search, reverse } = require("../controllers/geocode.controller");

// Nominatim's usage policy is ~1 req/sec. We cap each authenticated
// user well under that in aggregate; the frontend also debounces.
const geocodeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  message: { message: "Too many location lookups. Slow down a moment." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth-gated so only logged-in users (doctors/admins filling location
// fields) can use the proxy — keeps it from being an open relay.
router.get("/search", authMiddleware, geocodeLimiter, search);
router.get("/reverse", authMiddleware, geocodeLimiter, reverse);

module.exports = router;
