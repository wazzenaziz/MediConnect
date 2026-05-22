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

// === Global middleware ===
app.use(helmet());
const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? [process.env.FRONTEND_URL]
    : [/^http:\/\/localhost:\d+$/];
app.use(cors({ origin: allowedOrigins, credentials: true }));
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

// === Routes ===
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/doctors", doctorsRoutes);
app.use("/api/patients", patientsRoutes);
app.use("/api/schedules", schedulesRoutes);
app.use("/api/appointments", appointmentsRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/admin", adminRoutes);

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