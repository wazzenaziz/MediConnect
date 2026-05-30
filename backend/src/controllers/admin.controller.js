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

/**
 * POST /api/admin/doctors
 *
 * Atomic admin-side doctor creation:
 *   1. Create the Supabase auth user (skip email confirmation since
 *      the admin is vouching for them).
 *   2. Insert the matching row in our `users` table with role='doctor'.
 *   3. Insert the doctors profile (specialty, clinic, lat/lng).
 *
 * If any step fails, we attempt to roll back the previous steps so
 * we don't leave half-created accounts behind. This requires the
 * service-role key, which the backend already uses.
 */
const createDoctorAccount = async (req, res) => {
  const {
    email,
    password,
    full_name,
    phone,
    specialty,
    bio,
    clinic_address,
    latitude,
    longitude,
  } = req.body;

  let authUserId = null;
  try {
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      });

    if (authError || !authData?.user) {
      return res.status(400).json({
        message: "Could not create the auth account",
        error: authError?.message,
      });
    }

    authUserId = authData.user.id;

    const { error: profileError } = await supabase.from("users").insert([
      {
        id: authUserId,
        full_name,
        email,
        phone,
        role: "doctor",
      },
    ]);

    if (profileError) {
      // Roll back the auth user so the email isn't burned.
      await supabase.auth.admin.deleteUser(authUserId).catch(() => {});
      return res.status(500).json({
        message: "Could not create the user profile",
        error: profileError.message,
      });
    }

    const { data: doctorRow, error: doctorError } = await supabase
      .from("doctors")
      .insert([
        {
          user_id: authUserId,
          specialty,
          bio,
          clinic_address,
          latitude,
          longitude,
        },
      ])
      .select()
      .single();

    if (doctorError) {
      // Roll back the users row + auth user. Cascade on users → doctors
      // would handle this if we delete users, but to be explicit we
      // delete both.
      await supabase.from("users").delete().eq("id", authUserId).catch(() => {});
      await supabase.auth.admin.deleteUser(authUserId).catch(() => {});
      return res.status(500).json({
        message: "Could not create the doctor profile",
        error: doctorError.message,
      });
    }

    return res.status(201).json({
      message: "Doctor account created successfully",
      doctor: doctorRow,
      user: { id: authUserId, email, full_name, role: "doctor" },
    });
  } catch (err) {
    if (authUserId) {
      await supabase.auth.admin.deleteUser(authUserId).catch(() => {});
    }
    return res.status(500).json({
      message: "Server error while creating doctor",
      error: err.message,
    });
  }
};

module.exports = {
  getAdminStats,
  createDoctorAccount,
};