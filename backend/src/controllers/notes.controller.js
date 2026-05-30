const supabase = require("../config/supabase");
const { emitTo } = require("../config/io");

const { getLoggedInDoctorProfile, authorizeAppointmentAccess } = require("../utils/auth-helpers");

// Resolve a doctor's auth user_id from a doctor row id so we can emit
// to their personal socket room (user:<userId>).
const doctorUserIdFor = async (doctorId) => {
  const { data } = await supabase
    .from("doctors")
    .select("user_id")
    .eq("id", doctorId)
    .maybeSingle();
  return data?.user_id || null;
};

/**
 * POST /api/notes
 *
 * Doctor creates a note for one of their own appointments.
 * Admin can also create a note if needed.
 */
const createNote = async (req, res) => {
  try {
    const {
      appointment_id,
      diagnosis,
      prescription,
      note_text,
      follow_up_date,
    } = req.body;

    if (!appointment_id) {
      return res.status(400).json({
        message: "appointment_id is required",
      });
    }

    if (!diagnosis && !prescription && !note_text) {
      return res.status(400).json({
        message: "At least one of diagnosis, prescription, or note_text is required",
      });
    }

    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .select("id, doctor_id, patient_id")
      .eq("id", appointment_id)
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
      .from("notes")
      .insert([
        {
          appointment_id,
          doctor_id: appointment.doctor_id,
          patient_id: appointment.patient_id,
          diagnosis,
          prescription,
          note_text,
          follow_up_date,
        },
      ])
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        message: "Error creating note",
        error: error.message,
      });
    }

    // Fan out to the patient (they now have a note to read) and to the
    // doctor's other tabs (so the Notes page list stays in sync).
    (async () => {
      const doctorUserId = await doctorUserIdFor(data.doctor_id);
      const payload = { note: data };
      emitTo(`user:${data.patient_id}`, "note:created", payload);
      if (doctorUserId) emitTo(`user:${doctorUserId}`, "note:created", payload);
    })().catch((e) =>
      console.error("[socket] note:created fan-out:", e.message),
    );

    return res.status(201).json({
      message: "Note created successfully",
      note: data,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

/**
 * GET /api/notes/:id
 *
 * View one note by note id.
 */
const getNoteById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: note, error } = await supabase
      .from("notes")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !note) {
      return res.status(404).json({
        message: "Note not found",
      });
    }

    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .select("id, doctor_id, patient_id")
      .eq("id", note.appointment_id)
      .single();

    if (appointmentError || !appointment) {
      return res.status(404).json({
        message: "Related appointment not found",
      });
    }

    const auth = await authorizeAppointmentAccess(req, appointment);

    if (!auth.allowed) {
      return res.status(auth.status).json({ message: auth.message });
    }

    return res.status(200).json({
      message: "Note fetched successfully",
      note,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

/**
 * GET /api/notes/appointment/:appointmentId
 *
 * View notes for a specific appointment.
 */
const getNotesByAppointmentId = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .select("id, doctor_id, patient_id")
      .eq("id", appointmentId)
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
      .from("notes")
      .select("*")
      .eq("appointment_id", appointmentId);

    if (error) {
      return res.status(500).json({
        message: "Error fetching notes",
        error: error.message,
      });
    }

    return res.status(200).json({
      message: "Notes fetched successfully",
      notes: data,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

/**
 * GET /api/notes/patient/:patientId
 *
 * Patient can view only their own notes.
 * Admin can view any patient notes.
 * Doctor can view notes only if linked to their own appointments.
 */
const getNotesByPatientId = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (req.user.role === "patient" && req.user.id !== patientId) {
      return res.status(403).json({
        message: "You can only view your own notes",
      });
    }

    let query = supabase
      .from("notes")
      .select("*")
      .eq("patient_id", patientId);

    if (req.user.role === "doctor") {
      const doctorProfile = await getLoggedInDoctorProfile(req.user.id);

      if (!doctorProfile) {
        return res.status(404).json({
          message: "Doctor profile not found",
        });
      }

      query = query.eq("doctor_id", doctorProfile.id);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({
        message: "Error fetching patient notes",
        error: error.message,
      });
    }

    return res.status(200).json({
      message: "Patient notes fetched successfully",
      notes: data,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

/**
 * PATCH /api/notes/:id
 *
 * Doctor can update only notes linked to their own appointments.
 * Admin can update any note.
 */
const updateNote = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      diagnosis,
      prescription,
      note_text,
      follow_up_date,
    } = req.body;

    const { data: existingNote, error: noteError } = await supabase
      .from("notes")
      .select("*")
      .eq("id", id)
      .single();

    if (noteError || !existingNote) {
      return res.status(404).json({
        message: "Note not found",
      });
    }

    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .select("id, doctor_id, patient_id")
      .eq("id", existingNote.appointment_id)
      .single();

    if (appointmentError || !appointment) {
      return res.status(404).json({
        message: "Related appointment not found",
      });
    }

    if (req.user.role === "patient") {
      return res.status(403).json({
        message: "Patients cannot update medical notes",
      });
    }

    const auth = await authorizeAppointmentAccess(req, appointment);

    if (!auth.allowed) {
      return res.status(auth.status).json({ message: auth.message });
    }

    const { data, error } = await supabase
      .from("notes")
      .update({
        diagnosis,
        prescription,
        note_text,
        follow_up_date,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        message: "Error updating note",
        error: error.message,
      });
    }

    return res.status(200).json({
      message: "Note updated successfully",
      note: data,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

/**
 * DELETE /api/notes/:id
 *
 * Optional but useful.
 * Admin can delete any note.
 * Doctor can delete only their own notes.
 */
const deleteNote = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: existingNote, error: noteError } = await supabase
      .from("notes")
      .select("*")
      .eq("id", id)
      .single();

    if (noteError || !existingNote) {
      return res.status(404).json({
        message: "Note not found",
      });
    }

    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .select("id, doctor_id, patient_id")
      .eq("id", existingNote.appointment_id)
      .single();

    if (appointmentError || !appointment) {
      return res.status(404).json({
        message: "Related appointment not found",
      });
    }

    if (req.user.role === "patient") {
      return res.status(403).json({
        message: "Patients cannot delete medical notes",
      });
    }

    const auth = await authorizeAppointmentAccess(req, appointment);

    if (!auth.allowed) {
      return res.status(auth.status).json({ message: auth.message });
    }

    const { error } = await supabase
      .from("notes")
      .delete()
      .eq("id", id);

    if (error) {
      return res.status(400).json({
        message: "Error deleting note",
        error: error.message,
      });
    }

    return res.status(200).json({
      message: "Note deleted successfully",
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

module.exports = {
  createNote,
  getNoteById,
  getNotesByAppointmentId,
  getNotesByPatientId,
  updateNote,
  deleteNote,
};