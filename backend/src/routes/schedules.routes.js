const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const roleMiddleware = require("../middleware/role.middleware");


const {
    getAllSchedules,
    getSchedulesByDoctorId,
    createSchedule,
    updateSchedule,
    deleteSchedule
} = require("../controllers/schedules.controller");

router.get("/", authMiddleware, roleMiddleware("admin"), getAllSchedules);
router.post("/", authMiddleware, roleMiddleware("doctor", "admin"), createSchedule);
router.get("/doctor/:doctorId", authMiddleware, getSchedulesByDoctorId);
router.patch("/:id", authMiddleware, roleMiddleware("doctor", "admin"), updateSchedule);
router.delete("/:id", authMiddleware, roleMiddleware("doctor", "admin"), deleteSchedule);

module.exports = router;