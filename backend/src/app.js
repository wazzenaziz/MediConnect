// === Environment ===
require("dotenv").config();

// === Imports ===
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");

// === App + Route imports ===
const app = express();

const doctorsRoutes = require("./routes/doctors.routes");
const patientsRoutes = require("./routes/users.routes");
const schedulesRoutes = require("./routes/schedules.routes");
const appointmentsRoutes = require("./routes/appointments.routes");
const authRoutes = require("./routes/auth.routes");
const notesRoutes = require("./routes/notes.routes");
const adminRoutes = require("./routes/admin.routes");
const triageRoutes = require("./routes/triage.routes");

// === Global middleware ===
app.use(helmet());

// CORS: in dev, accept any localhost port (Vite often shuffles 5173/5174).
// In production, accept the configured FRONTEND_URL exactly, plus any of
// Vercel's auto-generated preview URLs that match the same project slug
// (e.g. medi-connect-<hash>-<team>.vercel.app for branch deploys).
const FRONTEND_URL = (process.env.FRONTEND_URL || "").trim().replace(/\/$/, "");
const isProd = process.env.NODE_ENV === "production";

const isAllowedOrigin = (origin) => {
  // Non-browser requests (curl, server-to-server) come without an Origin
  // header. cors() invokes our callback with `undefined` in that case —
  // allow it so health checks and curl debugging keep working.
  if (!origin) return true;
  const cleaned = origin.trim().replace(/\/$/, "");
  if (!isProd) {
    return /^http:\/\/localhost:\d+$/.test(cleaned);
  }
  if (FRONTEND_URL && cleaned === FRONTEND_URL) return true;
  // Vercel preview deployments: same project, different hash. Allow any
  // *.vercel.app under the same project slug as FRONTEND_URL.
  if (FRONTEND_URL.endsWith(".vercel.app")) {
    const slug = FRONTEND_URL
      .replace(/^https?:\/\//, "")
      .split(".")[0]
      .replace(/-[a-z0-9]+(-[a-z0-9]+)?$/i, ""); // strip trailing hash
    if (
      slug &&
      new RegExp(`^https://${slug}(-[a-z0-9-]+)?\\.vercel\\.app$`).test(cleaned)
    ) {
      return true;
    }
  }
  return false;
};

app.use(
  cors({
    origin: (origin, cb) => {
      if (isAllowedOrigin(origin)) return cb(null, true);
      console.warn(`[CORS] rejected origin: ${origin}`);
      return cb(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// === Rate limiting ===
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many auth attempts. Try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Lightweight health check, used by Render (and any uptime ping) to
// verify the process is alive without hitting the DB. Returns fast.
app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok", uptime: process.uptime() });
});

// === Routes ===
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/doctors", doctorsRoutes);
app.use("/api/patients", patientsRoutes);
app.use("/api/schedules", schedulesRoutes);
app.use("/api/appointments", appointmentsRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/triage", triageRoutes);

// === 404 + error handlers ===
app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || "Server error",
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});

module.exports = app;