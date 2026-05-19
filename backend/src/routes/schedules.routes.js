const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const roleMiddleware = require("../middleware/role.middleware");
const { validate } = require("../middleware/validate.middleware");
const { createScheduleSchema, updateScheduleSchema } = require("../schemas/schedules.schemas");

const {
    getAllSchedules,
    getSchedulesByDoctorId,
    createSchedule,
    updateSchedule,
    deleteSchedule
} = require("../controllers/schedules.controller");

router.get("/", authMiddleware, roleMiddleware("admin"), getAllSchedules);
router.post("/", authMiddleware, roleMiddleware("doctor", "admin"), validate(createScheduleSchema), createSchedule);
router.get("/doctor/:doctorId", authMiddleware, getSchedulesByDoctorId);
router.patch("/:id", authMiddleware, roleMiddleware("doctor", "admin"), validate(updateScheduleSchema), updateSchedule);
router.delete("/:id", authMiddleware, roleMiddleware("doctor", "admin"), deleteSchedule);

module.exports = router;