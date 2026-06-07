const supabase = require("../config/supabase");
const { sendTemplatedEmail } = require("../services/email.service");

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
        // Admin set a temporary password; force the doctor to change it on
        // first login. The login gate reads this flag.
        must_change_password: true,
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

    // Account is fully created — respond NOW. The welcome email is sent
    // asynchronously (fire-and-forget) so a mail failure can never fail
    // onboarding: the account exists and the admin still sees the
    // credentials on screen. We log failures for follow-up.
    res.status(201).json({
      message: "Doctor account created successfully",
      doctor: doctorRow,
      user: { id: authUserId, email, full_name, role: "doctor" },
    });

    const loginUrl = `${(process.env.FRONTEND_URL || "").replace(/\/$/, "")}/login`;
    sendTemplatedEmail({
      to: email,
      key: "doctor_welcome",
      vars: { full_name, email, password, login_url: loginUrl },
    })
      .then((r) => {
        if (!r.sent) {
          console.error(`[email] doctor_welcome to ${email} failed:`, r.error);
        }
      })
      .catch((err) =>
        console.error(`[email] doctor_welcome to ${email} threw:`, err.message),
      );
    return;
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

// ============================================================
// EMAIL TEMPLATES (admin only)
// ============================================================

const { previewTemplate } = require("../services/email.service");

// Sample data used to render previews so the admin sees realistic output
// without exposing a real doctor's credentials.
const SAMPLE_VARS = {
  doctor_welcome: {
    full_name: "Aymen Toumi",
    email: "doctor@example.com",
    password: "Temp-Pa55word!",
    login_url: `${(process.env.FRONTEND_URL || "").replace(/\/$/, "")}/login`,
  },
};

// GET /api/admin/templates — list all templates.
const listTemplates = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("email_templates")
      .select("key, name, subject, body_html, variables, updated_at")
      .order("name");
    if (error) {
      return res
        .status(500)
        .json({ message: "Could not load templates", error: error.message });
    }
    return res.status(200).json({ templates: data || [] });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET /api/admin/templates/:key — fetch one template.
const getTemplate = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("email_templates")
      .select("key, name, subject, body_html, variables, updated_at")
      .eq("key", req.params.key)
      .single();
    if (error || !data) {
      return res.status(404).json({ message: "Template not found" });
    }
    return res.status(200).json({ template: data });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// PUT /api/admin/templates/:key — update subject/body. We only allow editing
// existing templates (no create/delete) so a code-referenced key can't vanish.
const updateTemplate = async (req, res) => {
  const { subject, body_html } = req.body;
  try {
    const { data, error } = await supabase
      .from("email_templates")
      .update({ subject, body_html, updated_at: new Date().toISOString() })
      .eq("key", req.params.key)
      .select("key, name, subject, body_html, variables, updated_at")
      .single();
    if (error || !data) {
      return res
        .status(404)
        .json({ message: "Template not found", error: error?.message });
    }
    return res
      .status(200)
      .json({ message: "Template saved", template: data });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// POST /api/admin/templates/:key/preview — render with sample data (or the
// admin's in-progress draft body) WITHOUT sending. Lets the editor show a
// live preview of unsaved changes.
const previewTemplateHandler = async (req, res) => {
  const key = req.params.key;
  const vars = SAMPLE_VARS[key] || {};
  try {
    // If the admin sent a draft body, render that; else render the saved one.
    if (typeof req.body?.body_html === "string") {
      const { renderTemplate } = require("../services/email.service");
      return res.status(200).json({
        subject: renderTemplate(req.body.subject || "", vars),
        html: renderTemplate(req.body.body_html, vars),
        sample: vars,
      });
    }
    const rendered = await previewTemplate(key, vars);
    if (!rendered) return res.status(404).json({ message: "Template not found" });
    return res.status(200).json({ ...rendered, sample: vars });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = {
  getAdminStats,
  createDoctorAccount,
  listTemplates,
  getTemplate,
  updateTemplate,
  previewTemplateHandler,
};