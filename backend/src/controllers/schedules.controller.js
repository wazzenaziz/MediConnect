const supabase = require("../config/supabase");

const isValidTime = (time) => {
  if (!time) return true;

  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;
  return timeRegex.test(time);
};

const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const validateScheduleTimes = ({
  start_time,
  end_time,
  pause_start,
  pause_end,
  slot_duration,
  valid_from,
  valid_to,
}) => {
  if (!isValidTime(start_time) || !isValidTime(end_time)) {
    return "start_time and end_time must be valid time values";
  }

  if (pause_start && !isValidTime(pause_start)) {
    return "pause_start must be a valid time value";
  }

  if (pause_end && !isValidTime(pause_end)) {
    return "pause_end must be a valid time value";
  }

  if (start_time && end_time) {
    const startMinutes = timeToMinutes(start_time);
    const endMinutes = timeToMinutes(end_time);

    if (startMinutes >= endMinutes) {
      return "start_time must be before end_time";
    }

    if (slot_duration && Number(slot_duration) <= 0) {
      return "slot_duration must be greater than 0";
    }

    if (slot_duration && Number(slot_duration) > endMinutes - startMinutes) {
      return "slot_duration cannot be longer than the working period";
    }
  }

  if ((pause_start && !pause_end) || (!pause_start && pause_end)) {
    return "pause_start and pause_end must be provided together";
  }

  if (pause_start && pause_end && start_time && end_time) {
    const startMinutes = timeToMinutes(start_time);
    const endMinutes = timeToMinutes(end_time);
    const pauseStartMinutes = timeToMinutes(pause_start);
    const pauseEndMinutes = timeToMinutes(pause_end);

    if (pauseStartMinutes >= pauseEndMinutes) {
      return "pause_start must be before pause_end";
    }

    if (pauseStartMinutes < startMinutes || pauseEndMinutes > endMinutes) {
      return "Pause time must be inside working hours";
    }
  }

  if (valid_from && valid_to) {
    const validFromDate = new Date(valid_from);
    const validToDate = new Date(valid_to);

    if (isNaN(validFromDate.getTime()) || isNaN(validToDate.getTime())) {
      return "valid_from and valid_to must be valid dates";
    }

    if (validFromDate > validToDate) {
      return "valid_from must be before or equal to valid_to";
    }
  }

  return null;
};

const getAllSchedules = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("schedules")
      .select("*");

    if (error) {
      return res.status(500).json({
        message: "Error fetching schedules",
        error: error.message,
      });
    }

    return res.status(200).json({
      message: "Schedules fetched successfully",
      schedules: data,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

const getSchedulesByDoctorId = async (req, res) => {
  try {
    const { doctorId } = req.params;

    const { data, error } = await supabase
      .from("schedules")
      .select("*")
      .eq("doctor_id", doctorId);

    if (error) {
      return res.status(500).json({
        message: "Error fetching doctor schedules",
        error: error.message,
      });
    }

    return res.status(200).json({
      message: "Doctor schedules fetched successfully",
      schedules: data,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

const createSchedule = async (req, res) => {
  try {
    let {
      doctor_id,
      day_of_week,
      start_time,
      end_time,
      pause_start,
      pause_end,
      slot_duration,
      valid_from,
      valid_to,
    } = req.body;

    if (req.user.role === "doctor") {
      const { data: doctorProfile, error: doctorError } = await supabase
        .from("doctors")
        .select("id")
        .eq("user_id", req.user.id)
        .single();

      if (doctorError || !doctorProfile) {
        return res.status(404).json({
          message: "Doctor profile not found",
        });
      }

      doctor_id = doctorProfile.id;
    }

    if (!doctor_id || !day_of_week || !start_time || !end_time || !slot_duration) {
      return res.status(400).json({
        message: "doctor_id, day_of_week, start_time, end_time, and slot_duration are required",
      });
    }

    const validationError = validateScheduleTimes({
      start_time,
      end_time,
      pause_start,
      pause_end,
      slot_duration,
      valid_from,
      valid_to,
    });

    if (validationError) {
      return res.status(400).json({
        message: validationError,
      });
    }

    const { data, error } = await supabase
      .from("schedules")
      .insert([
        {
          doctor_id,
          day_of_week,
          start_time,
          end_time,
          pause_start,
          pause_end,
          slot_duration,
          valid_from,
          valid_to,
        },
      ])
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        message: "Error creating schedule",
        error: error.message,
      });
    }

    return res.status(201).json({
      message: "Schedule created successfully",
      schedule: data,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

const updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: existingSchedule, error: scheduleError } = await supabase
      .from("schedules")
      .select("id, doctor_id")
      .eq("id", id)
      .single();

    if (scheduleError || !existingSchedule) {
      return res.status(404).json({
        message: "Schedule not found",
      });
    }

    if (req.user.role === "doctor") {
      const { data: doctorProfile, error: doctorError } = await supabase
        .from("doctors")
        .select("id")
        .eq("user_id", req.user.id)
        .single();

      if (doctorError || !doctorProfile) {
        return res.status(404).json({
          message: "Doctor profile not found",
        });
      }

      if (doctorProfile.id !== existingSchedule.doctor_id) {
        return res.status(403).json({
          message: "You can only update your own schedules",
        });
      }
    }

    const {
      day_of_week,
      start_time,
      end_time,
      pause_start,
      pause_end,
      slot_duration,
      valid_from,
      valid_to,
    } = req.body;

    const validationError = validateScheduleTimes({
      start_time,
      end_time,
      pause_start,
      pause_end,
      slot_duration,
      valid_from,
      valid_to,
    });

    if (validationError) {
      return res.status(400).json({
        message: validationError,
      });
    }

    const { data, error } = await supabase
      .from("schedules")
      .update({
        day_of_week,
        start_time,
        end_time,
        pause_start,
        pause_end,
        slot_duration,
        valid_from,
        valid_to,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        message: "Error updating schedule",
        error: error.message,
      });
    }

    return res.status(200).json({
      message: "Schedule updated successfully",
      schedule: data,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

const deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: existingSchedule, error: scheduleError } = await supabase
      .from("schedules")
      .select("id, doctor_id")
      .eq("id", id)
      .single();

    if (scheduleError || !existingSchedule) {
      return res.status(404).json({
        message: "Schedule not found",
      });
    }

    if (req.user.role === "doctor") {
      const { data: doctorProfile, error: doctorError } = await supabase
        .from("doctors")
        .select("id")
        .eq("user_id", req.user.id)
        .single();

      if (doctorError || !doctorProfile) {
        return res.status(404).json({
          message: "Doctor profile not found",
        });
      }

      if (doctorProfile.id !== existingSchedule.doctor_id) {
        return res.status(403).json({
          message: "You can only delete your own schedules",
        });
      }
    }

    const { error } = await supabase
      .from("schedules")
      .delete()
      .eq("id", id);

    if (error) {
      return res.status(400).json({
        message: "Error deleting schedule",
        error: error.message,
      });
    }

    return res.status(200).json({
      message: "Schedule deleted successfully",
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

module.exports = {
    getAllSchedules,
    getSchedulesByDoctorId,
    createSchedule,
    updateSchedule,
    deleteSchedule
};