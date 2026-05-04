const supabase = require("../config/supabase");

const getAllAppointments = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("appointments")
      .select("*");

    if (error) {
      return res.status(500).json({
        message: "Error fetching schedules",
        error: error.message,
      });
    }

    return res.status(200).json({
      message: "Appointments fetched successfully",
      appointments: data,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

const getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return res.status(404).json({
        message: "Appointment not found",
        error: error.message,
      });
    }

    return res.status(200).json({
      message: "Appointment fetched successfully",
      appointment: data,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

const getAppointmentsByDoctorId = async (req, res) => {
  try {
    const { doctorId } = req.params;

    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("doctor_id", doctorId);

    if (error) {
      return res.status(500).json({
        message: "Error fetching appointment schedules",
        error: error.message,
      });
    }

    return res.status(200).json({
      message: "Appointments schedules fetched successfully",
      appointments: data,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

const getAppointmentsByPatientId = async (req, res) => {
  try {
    const { patientId } = req.params;

    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("patient_id", patientId);

    if (error) {
      return res.status(500).json({
        message: "Error fetching appointment schedules",
        error: error.message,
      });
    }

    return res.status(200).json({
      message: "Appointments schedules fetched successfully",
      appointments: data,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

const createAppointment = async (req, res) => {
  try {
    const {
      doctor_id,
      patient_id,
      start_time,
      end_time,
    } = req.body;

    if (!doctor_id || !patient_id || !start_time || !end_time ) {
      return res.status(400).json({
        message: "doctor_id, patient_id, start_time, end_time are required",
      });
    }

    const { data: existingAppointment, error: conflictError } = await supabase
      .from("appointments")
      .select("id")
      .eq("doctor_id", doctor_id)
      .eq("start_time", start_time)
      .neq("status", "cancelled")
      .maybeSingle();

    if (conflictError) {
      return res.status(500).json({
        message: "Error checking appointment availability",
        error: conflictError.message,
      });
    }

    if (existingAppointment) {
      return res.status(409).json({
        message: "This appointment slot is already booked",
      });
    }

    const { data, error } = await supabase
      .from("appointments")
      .insert([
        {
          doctor_id,
          patient_id,
          status : "pending",
          start_time,
          end_time,
        },
      ])
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        message: "Error creating appointment",
        error: error.message,
      });
    }

    return res.status(201).json({
      message: "Appointment created successfully",
      appointment: data,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ["pending", "confirmed", "cancelled", "completed"];

    if (!status) {
      return res.status(400).json({
        message: "Status is required",
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid status value",
        allowedStatuses,
      });
    }

    const { data, error } = await supabase
      .from("appointments")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        message: "Error updating appointment status",
        error: error.message,
      });
    }

    return res.status(200).json({
      message: "Appointment status updated successfully",
      appointment: data,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

const cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        message: "Error cancelling appointment",
        error: error.message,
      });
    }

    return res.status(200).json({
      message: "Appointment cancelled successfully",
      appointment: data,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

module.exports = {
    getAllAppointments,
    getAppointmentById,
    getAppointmentsByDoctorId,
    getAppointmentsByPatientId,
    createAppointment,
    updateAppointmentStatus,
    cancelAppointment
};