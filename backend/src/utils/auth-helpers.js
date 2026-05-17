const supabase = require("../config/supabase");

/**
 * Get the doctor profile linked to the logged-in user.
 *
 * users.id = doctors.user_id
 *
 * @param {string} userId - The user id (from req.user.id)
 * @returns {Promise<{id: string} | null>} the doctor profile, or null if none
 */
const getLoggedInDoctorProfile = async (userId) => {
  const { data: doctorProfile, error } = await supabase
    .from("doctors")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (error || !doctorProfile) {
    return null;
  }

  return doctorProfile;
};

/**
 * Authorize the logged-in user to access a specific appointment.
 *
 * admin   → can access any appointment
 * patient → can access only their own appointments
 * doctor  → can access only appointments tied to their doctor profile
 *
 * Returns a rich result object so callers can produce a proper HTTP response:
 *   { allowed: true }
 *   { allowed: false, status: 403, message: "..." }
 *   { allowed: false, status: 404, message: "Doctor profile not found" }
 *
 * @param {object} req - the Express request (req.user must be set)
 * @param {object} appointment - the appointment row (must have doctor_id, patient_id)
 */
const authorizeAppointmentAccess = async (req, appointment) => {
  if (req.user.role === "admin") {
    return { allowed: true };
  }

  if (req.user.role === "patient") {
    if (appointment.patient_id !== req.user.id) {
      return {
        allowed: false,
        status: 403,
        message: "You can only access your own appointments",
      };
    }
    return { allowed: true };
  }

  if (req.user.role === "doctor") {
    const doctorProfile = await getLoggedInDoctorProfile(req.user.id);

    if (!doctorProfile) {
      return {
        allowed: false,
        status: 404,
        message: "Doctor profile not found",
      };
    }

    if (doctorProfile.id !== appointment.doctor_id) {
      return {
        allowed: false,
        status: 403,
        message: "You can only access your own doctor appointments",
      };
    }

    return { allowed: true };
  }

  return { allowed: false, status: 403, message: "Access denied" };
};

module.exports = {
  getLoggedInDoctorProfile,
  authorizeAppointmentAccess,
};