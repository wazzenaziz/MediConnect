const supabase = require("../config/supabase");

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
    const {
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

    if (!doctor_id || !day_of_week || !start_time || !end_time || !slot_duration) {
      return res.status(400).json({
        message: "doctor_id, day_of_week, start_time, end_time, and slot_duration are required",
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