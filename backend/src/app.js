const express = require("express");
const app = express();

const doctorsRoutes = require("./routes/doctors.routes");
const patientsRoutes = require("./routes/users.routes");
const schedulesRoutes = require("./routes/schedules.routes");
const appointmentsRoutes = require("./routes/appointments.routes");

app.use(express.json());

app.use("/api/doctors", doctorsRoutes);
app.use("/api/patients", patientsRoutes);
app.use("/api/schedules", schedulesRoutes);
app.use("/api/appointments", appointmentsRoutes);

module.exports = app;