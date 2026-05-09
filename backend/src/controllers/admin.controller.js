const supabase = require("../config/supabase");

const getAdminStats = async (req, res) => {
  try {
    const { count: patientsCount, error: patientsError } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "patient");

    if (patientsError) {
      return res.status(500).json({
        message: "Error counting patients",
        error: patientsError.message,
      });
    }

    const { count: doctorsCount, error: doctorsError } = await supabase
      .from("doctors")
      .select("*", { count: "exact", head: true });

    if (doctorsError) {
      return res.status(500).json({
        message: "Error counting doctors",
        error: doctorsError.message,
      });
    }

    const { count: appointmentsCount, error: appointmentsError } = await supabase
      .from("appointments")
      .select("*", { count: "exact", head: true });

    if (appointmentsError) {
      return res.status(500).json({
        message: "Error counting appointments",
        error: appointmentsError.message,
      });
    }

    const { count: pendingAppointments, error: pendingError } = await supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    if (pendingError) {
      return res.status(500).json({
        message: "Error counting pending appointments",
        error: pendingError.message,
      });
    }

    const { count: confirmedAppointments, error: confirmedError } = await supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("status", "confirmed");

    if (confirmedError) {
      return res.status(500).json({
        message: "Error counting confirmed appointments",
        error: confirmedError.message,
      });
    }

    const { count: cancelledAppointments, error: cancelledError } = await supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("status", "cancelled");

    if (cancelledError) {
      return res.status(500).json({
        message: "Error counting cancelled appointments",
        error: cancelledError.message,
      });
    }

    const { count: completedAppointments, error: completedError } = await supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed");

    if (completedError) {
      return res.status(500).json({
        message: "Error counting completed appointments",
        error: completedError.message,
      });
    }

    return res.status(200).json({
      message: "Admin statistics fetched successfully",
      stats: {
        patientsCount,
        doctorsCount,
        appointmentsCount,
        pendingAppointments,
        confirmedAppointments,
        cancelledAppointments,
        completedAppointments,
      },
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

module.exports = {
  getAdminStats,
};