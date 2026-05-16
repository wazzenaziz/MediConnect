const supabase = require("../config/supabase");

const TIMEZONE = "Africa/Tunis";

const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:00`;
};

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

    const { data: appointment, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !appointment) {
      return res.status(404).json({
        message: "Appointment not found",
        error: error?.message,
      });
    }

    if (req.user.role === "patient" && appointment.patient_id !== req.user.id) {
      return res.status(403).json({
        message: "You can only access your own appointments",
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

      if (doctorProfile.id !== appointment.doctor_id) {
        return res.status(403).json({
          message: "You can only access your own doctor appointments",
        });
      }
    }

    return res.status(200).json({
      message: "Appointment fetched successfully",
      appointment,
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

      if (doctorProfile.id !== doctorId) {
        return res.status(403).json({
          message: "You can only access your own doctor appointments",
        });
      }
    }

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

    if (req.user.role === "patient" && req.user.id !== patientId) {
      return res.status(403).json({
        message: "You can only access your own appointments",
      });
    }

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
      start_time,
      end_time,
    } = req.body;

    const patient_id = req.user.id;

    if (!doctor_id || !start_time || !end_time) {
      return res.status(400).json({
        message: "doctor_id, start_time, and end_time are required",
      });
    }

    const appointmentStart = new Date(start_time);
    const appointmentEnd = new Date(end_time);
    const now = new Date();

    if (isNaN(appointmentStart.getTime()) || isNaN(appointmentEnd.getTime())) {
      return res.status(400).json({
        message: "Invalid start_time or end_time format",
      });
    }

    if (appointmentStart >= appointmentEnd) {
      return res.status(400).json({
        message: "start_time must be before end_time",
      });
    }

    if (appointmentStart < now) {
      return res.status(400).json({
        message: "Cannot create an appointment in the past",
      });
    }

    const { data: doctor, error: doctorError } = await supabase
      .from("doctors")
      .select("id")
      .eq("id", doctor_id)
      .single();

    if (doctorError || !doctor) {
      return res.status(404).json({
        message: "Doctor not found",
      });
    }

    const appointmentDate = appointmentStart.toLocaleDateString("en-CA", { timeZone: TIMEZONE });

    const dayOfWeek = appointmentStart
      .toLocaleDateString("en-US", { timeZone: TIMEZONE, weekday: "long" })
      .toLowerCase();

    const { data: schedule, error: scheduleError } = await supabase
      .from("schedules")
      .select("*")
      .eq("doctor_id", doctor_id)
      .eq("day_of_week", dayOfWeek)
      .lte("valid_from", appointmentDate)
      .gte("valid_to", appointmentDate)
      .maybeSingle();

    if (scheduleError) {
      return res.status(500).json({
        message: "Error checking doctor schedule",
        error: scheduleError.message,
      });
    }

    if (!schedule) {
      return res.status(400).json({
        message: "Doctor is not available on this date",
      });
    }

    const requestedStartTime = appointmentStart.toTimeString().split(" ")[0];
    const requestedEndTime = appointmentEnd.toTimeString().split(" ")[0];

    if (
      requestedStartTime < schedule.start_time ||
      requestedEndTime > schedule.end_time
    ) {
      return res.status(400).json({
        message: "Appointment time is outside the doctor's working hours",
      });
    }

    if (
      schedule.pause_start &&
      schedule.pause_end &&
      requestedStartTime < schedule.pause_end &&
      requestedEndTime > schedule.pause_start
    ) {
      return res.status(400).json({
        message: "Appointment time overlaps with the doctor's pause time",
      });
    }

    const durationInMinutes =
      (appointmentEnd - appointmentStart) / (1000 * 60);

    if (durationInMinutes !== schedule.slot_duration) {
      return res.status(400).json({
        message: `Appointment duration must be ${schedule.slot_duration} minutes`,
      });
    }

    const { data: existingAppointment, error: conflictError } = await supabase
      .from("appointments")
      .select("id")
      .eq("doctor_id", doctor_id)
      .lt("start_time", end_time)
      .gt("end_time", start_time)
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
          status: "pending",
          start_time,
          end_time,
        },
      ])
      .select()
      .single();

    if (error) {
      if (error.code === "23P01") {
        return res.status(409).json({
          message: "This appointment slot was just booked by another patient. Please choose a different slot.",
        });
      }

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

const getAvailableSlots = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        message: "Date is required",
      });
    }

    const dayOfWeek = new Date(date).toLocaleDateString("en-US", {
      weekday: "long", timeZone: TIMEZONE,
    }).toLowerCase();

    const { data: schedule, error: scheduleError } = await supabase
      .from("schedules")
      .select("*")
      .eq("doctor_id", doctorId)
      .eq("day_of_week", dayOfWeek)
      .lte("valid_from", date)
      .gte("valid_to", date)
      .maybeSingle();

    if (scheduleError) {
      return res.status(500).json({
        message: "Error fetching doctor schedule",
        error: scheduleError.message,
      });
    }

    if (!schedule) {
      return res.status(200).json({
        message: "Doctor is not available on this date",
        doctorId,
        date,
        dayOfWeek,
        availableSlots: [],
      });
    }

    const startMinutes = timeToMinutes(schedule.start_time);
    const endMinutes = timeToMinutes(schedule.end_time);
    const pauseStartMinutes = schedule.pause_start
      ? timeToMinutes(schedule.pause_start)
      : null;
    const pauseEndMinutes = schedule.pause_end
      ? timeToMinutes(schedule.pause_end)
      : null;

    const availableSlots = [];

    for (
      let current = startMinutes;
      current + schedule.slot_duration <= endMinutes;
      current += schedule.slot_duration
    ) {
      const slotStart = current;
      const slotEnd = current + schedule.slot_duration;

      const overlapsPause =
        pauseStartMinutes !== null &&
        pauseEndMinutes !== null &&
        slotStart < pauseEndMinutes &&
        slotEnd > pauseStartMinutes;

      if (!overlapsPause) {
        availableSlots.push({
          start_time: `${date}T${minutesToTime(slotStart)}`,
          end_time: `${date}T${minutesToTime(slotEnd)}`,
        });
      }
    }

    const dayStart = `${date}T00:00:00`;
    const dayEnd = `${date}T23:59:59`;

    const { data: bookedAppointments, error: bookedError } = await supabase
      .from("appointments")
      .select("start_time, end_time")
      .eq("doctor_id", doctorId)
      .gte("start_time", dayStart)
      .lte("start_time", dayEnd)
      .neq("status", "cancelled");

    if (bookedError) {
      return res.status(500).json({
        message: "Error fetching booked appointments",
        error: bookedError.message,
      });
    }

    const finalAvailableSlots = availableSlots.filter((slot) => {
      const slotStart = new Date(slot.start_time);
      const slotEnd = new Date(slot.end_time);

      const isBooked = bookedAppointments.some((appointment) => {
        const appointmentStart = new Date(appointment.start_time);
        const appointmentEnd = new Date(appointment.end_time);

        return slotStart < appointmentEnd && slotEnd > appointmentStart;
      });

      return !isBooked;
    });

    return res.status(200).json({
      message: "Available slots fetched successfully",
      doctorId,
      date,
      dayOfWeek,
      availableSlots: finalAvailableSlots,
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

    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .select("id, doctor_id")
      .eq("id", id)
      .single();

    if (appointmentError || !appointment) {
      return res.status(404).json({
        message: "Appointment not found",
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

      if (doctorProfile.id !== appointment.doctor_id) {
        return res.status(403).json({
          message: "You can only update status for your own doctor appointments",
        });
      }
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

    const { data: appointment, error: fetchError } = await supabase
      .from("appointments")
      .select("id, patient_id")
      .eq("id", id)
      .single();

    if (fetchError || !appointment) {
      return res.status(404).json({
        message: "Appointment not found",
      });
    }

    if (req.user.role === "patient" && appointment.patient_id !== req.user.id) {
      return res.status(403).json({
        message: "You can only cancel your own appointments",
      });
    }

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
    cancelAppointment,
    getAvailableSlots,
};