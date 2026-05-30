const supabase = require("../config/supabase");
const { emitTo } = require("../config/io");

const { getLoggedInDoctorProfile, authorizeAppointmentAccess } = require("../utils/auth-helpers");

// Resolve the doctor's auth user_id from a doctor row id so we can target
// their personal socket room (user:<userId>). Returns null if not found.
const doctorUserIdFor = async (doctorId) => {
  const { data } = await supabase
    .from("doctors")
    .select("user_id")
    .eq("id", doctorId)
    .maybeSingle();
  return data?.user_id || null;
};

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

    const auth = await authorizeAppointmentAccess(req, appointment);

    if (!auth.allowed) {
      return res.status(auth.status).json({ message: auth.message });
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
      const doctorProfile = await getLoggedInDoctorProfile(req.user.id);

      if (!doctorProfile) {
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
      // 23P01: exclusion_violation (the EXCLUDE constraint on tsrange
      //        overlap — the real concurrency safeguard, ignores
      //        cancelled rows).
      // 23505: unique_violation (defensive — migration 013 dropped the
      //        obsolete UNIQUE, but if one is ever reintroduced this
      //        surfaces it cleanly as a 409 instead of a generic 500).
      if (error.code === "23P01" || error.code === "23505") {
        return res.status(409).json({
          message: "This appointment slot was just booked by another patient. Please choose a different slot.",
        });
      }

      return res.status(500).json({
        message: "Error creating appointment",
        error: error.message,
      });
    }

    // Fire-and-forget realtime fan-out. We do NOT await; if the socket
    // layer is degraded, the patient still gets their 201 in time.
    (async () => {
      const doctorUserId = await doctorUserIdFor(doctor_id);
      const payload = {
        appointment: data,
        patient: { id: req.user.id, full_name: req.user.full_name },
      };
      if (doctorUserId) emitTo(`user:${doctorUserId}`, "appointment:created", payload);
      emitTo(`user:${patient_id}`, "appointment:created", payload);
      // Slot picker refresh fan-out — every client viewing this doctor.
      emitTo(`doctor:${doctor_id}`, "doctor:slot-changed", {
        doctor_id,
        start_time: data.start_time,
        end_time: data.end_time,
        reason: "booked",
      });
    })().catch((e) => console.error("[socket] create fan-out:", e.message));

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

    // Compare in Tunis wall-clock time on both sides.
    //
    // Slot strings were built as `${date}T${HH:MM:00}` from the schedule
    // — they already represent Tunis wall-clock minutes.
    //
    // Booked appointments come from a timezone-naive TIMESTAMP column
    // that stores UTC. We render them in Tunis (the doctor's clinic tz)
    // by formatting the JS Date in `Africa/Tunis`. This avoids fragile
    // Date math (no Z-appending hacks, no server-tz assumptions) and
    // matches how the rest of the app interprets these timestamps.
    const toTunisMinutes = (utcLike) => {
      const d = new Date(/Z$|[+-]\d{2}:?\d{2}$/.test(utcLike) ? utcLike : utcLike + "Z");
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: TIMEZONE,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).formatToParts(d);
      const hh = Number(parts.find((p) => p.type === "hour").value);
      const mm = Number(parts.find((p) => p.type === "minute").value);
      return hh * 60 + mm;
    };

    const finalAvailableSlots = availableSlots.filter((slot) => {
      // Slot strings are local wall-clock — pull HH:MM straight out.
      const slotStartMin = timeToMinutes(slot.start_time.split("T")[1]);
      const slotEndMin = timeToMinutes(slot.end_time.split("T")[1]);

      const isBooked = bookedAppointments.some((appointment) => {
        const apptStartMin = toTunisMinutes(appointment.start_time);
        const apptEndMin = toTunisMinutes(appointment.end_time);
        return slotStartMin < apptEndMin && slotEndMin > apptStartMin;
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

    const auth = await authorizeAppointmentAccess(req, appointment);

    if (!auth.allowed) {
      return res.status(auth.status).json({ message: auth.message });
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

    // Fan-out: tell the patient + the doctor that the status changed.
    // The triggering side (req.user.role) gets notified too — keeps
    // their other open tabs in sync.
    //
    // If the new status is "cancelled", we also emit the dedicated
    // appointment:cancelled event so the client-side handlers (which
    // produce the actual user-facing notification text for cancels)
    // fire regardless of whether the cancel came via PATCH /:id/cancel
    // (patient flow) or PATCH /:id/status (doctor flow). The slot
    // picker fan-out also goes out so any open slot pickers refresh.
    (async () => {
      const doctorUserId = await doctorUserIdFor(data.doctor_id);
      const statusPayload = {
        appointment: data,
        status: data.status,
        changed_by: req.user.role,
      };
      if (doctorUserId)
        emitTo(`user:${doctorUserId}`, "appointment:status-changed", statusPayload);
      emitTo(`user:${data.patient_id}`, "appointment:status-changed", statusPayload);

      if (data.status === "cancelled") {
        const cancelPayload = {
          appointment: data,
          cancelled_by: req.user.role,
        };
        if (doctorUserId)
          emitTo(`user:${doctorUserId}`, "appointment:cancelled", cancelPayload);
        emitTo(`user:${data.patient_id}`, "appointment:cancelled", cancelPayload);
        emitTo(`doctor:${data.doctor_id}`, "doctor:slot-changed", {
          doctor_id: data.doctor_id,
          start_time: data.start_time,
          end_time: data.end_time,
          reason: "cancelled",
        });
      }
    })().catch((e) =>
      console.error("[socket] status-changed fan-out:", e.message),
    );

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
      .select("id, patient_id, doctor_id")
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

    // Realtime fan-out. Tell the doctor + the patient (in case they
    // cancelled in one tab and have /patient/appointments open in
    // another), and broadcast a slot-changed event so any open slot
    // pickers refresh and show the now-free time.
    (async () => {
      const doctorUserId = await doctorUserIdFor(data.doctor_id);
      const payload = {
        appointment: data,
        cancelled_by: req.user.role,
      };
      if (doctorUserId) emitTo(`user:${doctorUserId}`, "appointment:cancelled", payload);
      emitTo(`user:${data.patient_id}`, "appointment:cancelled", payload);
      emitTo(`doctor:${data.doctor_id}`, "doctor:slot-changed", {
        doctor_id: data.doctor_id,
        start_time: data.start_time,
        end_time: data.end_time,
        reason: "cancelled",
      });
    })().catch((e) => console.error("[socket] cancel fan-out:", e.message));

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