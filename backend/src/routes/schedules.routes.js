const express = require("express");
const router = express.Router();

const {
    getAllSchedules,
    getSchedulesByDoctorId,
    createSchedule,
    updateSchedule,
    deleteSchedule
} = require("../controllers/schedules.controller");

router.get("/", getAllSchedules);
router.post("/", createSchedule);
router.get("/doctor/:doctorId", getSchedulesByDoctorId);
router.patch("/:id", updateSchedule);
router.delete("/:id", deleteSchedule);


module.exports = router;