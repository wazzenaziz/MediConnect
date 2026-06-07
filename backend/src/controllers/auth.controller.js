const supabase = require("../config/supabase");
const { supabaseAuth } = require("../config/supabase");

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    // Use the dedicated auth client so the service_role `supabase` client below
    // is never bound to this user's session (which would break RLS).
    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({
        message: "Invalid email or password.",
        error: error.message,
      });
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id, email, full_name, phone, role, must_change_password")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profile) {
      return res.status(500).json({
        message: "Authenticated but profile not found.",
        error: profileError?.message,
      });
    }

    return res.status(200).json({
      message: "Login successful.",
      user: profile,
      session: data.session,
      access_token: data.session.access_token,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error.",
      error: err.message,
    });
  }
};

const register = async (req, res) => {
  try {
    const { full_name, email, password, phone } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({
        message: "full_name, email, and password are required.",
      });
    }

    const { data: authData, error: authError } = await supabaseAuth.auth.signUp({
      email,
      password,
    });

    if (authError) {
      return res.status(400).json({
        message: "Error registering user.",
        error: authError.message,
      });
    }

    const userId = authData.user.id;

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .insert([
        {
          id: userId,
          full_name,
          email,
          phone,
          role: "patient",
        },
      ])
      .select()
      .single();

    if (profileError) {
      return res.status(500).json({
        message: "User registered in auth, but profile creation failed.",
        error: profileError.message,
      });
    }

    return res.status(201).json({
      message: "User registered successfully.",
      user: profile,
      session: authData.session,
      access_token: authData.session?.access_token,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error.",
      error: err.message,
    });
  }
};

// ============================================================
// FORGOT PASSWORD — request a reset link
// ============================================================
// POST /api/auth/forgot-password   body: { email }
//
// Delegates token generation + email delivery to Supabase Auth
// (resetPasswordForEmail), which issues a secure, single-use,
// time-limited recovery token (default 1 hour) and emails a link
// pointing at our frontend reset page.
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // The link Supabase emails sends the user here; the frontend page reads
    // the recovery token from the URL hash and posts it to /reset-password.
    const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(
      /\/$/,
      ""
    );
    const redirectTo = `${frontendUrl}/reset-password`;

    const { error } = await supabaseAuth.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    // SECURITY: never reveal whether an email is registered. Whether the
    // address exists or not, we log internally but return the same generic
    // 200 to the client — this prevents account-enumeration via this endpoint.
    if (error) {
      console.warn(`[auth] forgot-password failed for ${email}: ${error.message}`);
    } else {
      console.log(`[auth] password reset requested for ${email}`);
    }

    return res.status(200).json({
      message:
        "If an account exists for that email, a password reset link has been sent.",
    });
  } catch (err) {
    // Even on an unexpected error we avoid leaking detail to the caller; the
    // generic message keeps the enumeration-safe contract intact.
    console.error("[auth] forgot-password error:", err.message);
    return res.status(200).json({
      message:
        "If an account exists for that email, a password reset link has been sent.",
    });
  }
};

// ============================================================
// RESET PASSWORD — apply a new password using the recovery token
// ============================================================
// POST /api/auth/reset-password   body: { access_token, password }
//
// The frontend has no Supabase client, so the recovery token is verified
// here on the backend: we resolve the token to a user, then update that
// user's password with the service_role admin client.
const resetPassword = async (req, res) => {
  try {
    const { access_token, password } = req.body;

    // Resolve the recovery token to a user. getUser(token) returns an error
    // if the token is invalid, malformed, or EXPIRED — that single check
    // enforces the time-limit edge case for us.
    const { data: userData, error: tokenError } =
      await supabaseAuth.auth.getUser(access_token);

    if (tokenError || !userData?.user) {
      console.warn(
        `[auth] reset-password rejected (invalid/expired token): ${tokenError?.message || "no user"}`
      );
      // 400 (NOT 401): the frontend's axios interceptor force-redirects to
      // /login on 401, which would yank the user out of the reset page.
      return res.status(400).json({
        message:
          "This reset link is invalid or has expired. Please request a new one.",
      });
    }

    const userId = userData.user.id;

    // Update the password via the admin (service_role) client. Supabase hashes
    // it (bcrypt) before storage — we never see or persist the plaintext.
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      { password }
    );

    if (updateError) {
      console.error(
        `[auth] reset-password update failed for user ${userId}: ${updateError.message}`
      );
      return res.status(400).json({
        message: "Could not reset password.",
        error: updateError.message,
      });
    }

    console.log(`[auth] password reset completed for user ${userId}`);
    return res.status(200).json({
      message: "Password updated. You can now log in with your new password.",
    });
  } catch (err) {
    console.error("[auth] reset-password error:", err.message);
    return res.status(500).json({
      message: "Server error.",
      error: err.message,
    });
  }
};

// ============================================================
// GOOGLE SIGN-IN — log in or register with a Google account
// ============================================================
// POST /api/auth/google   body: { id_token, nonce? }
//
// The frontend uses Google Identity Services to obtain a Google ID token
// (a signed JWT). We hand that token to Supabase, which VERIFIES it against
// Google's keys, creates-or-finds the auth.users record, and returns a real
// Supabase session. We never trust the token ourselves — verification is
// Supabase's job — and because the session is a genuine Supabase JWT, RLS
// keeps working exactly as it does for email login.
const googleSignIn = async (req, res) => {
  try {
    const { id_token, nonce } = req.body;

    // Exchange the Google ID token for a Supabase session. Use the dedicated
    // auth client so the service_role `supabase` client never holds a user
    // session (same RLS-safety rule as login/register).
    const { data, error } = await supabaseAuth.auth.signInWithIdToken({
      provider: "google",
      token: id_token,
      nonce,
    });

    if (error || !data?.user || !data?.session) {
      console.warn(`[auth] google sign-in rejected: ${error?.message || "no session"}`);
      // 400 (NOT 401): a 401 trips the frontend axios interceptor and bounces
      // the user to /login mid-flow.
      return res.status(400).json({
        message: "Google sign-in failed. Please try again.",
        error: error?.message,
      });
    }

    const authUser = data.user;

    // Look up the app profile. A returning Google user already has one; a
    // first-time user does not, so we create it now (mirroring `register`).
    let { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id, email, full_name, phone, role")
      .eq("id", authUser.id)
      .single();

    if (profileError || !profile) {
      // First Google sign-in for this account → provision a patient profile.
      // Google's verified identity fields live in user_metadata.
      const meta = authUser.user_metadata || {};
      const fullName =
        meta.full_name || meta.name || authUser.email?.split("@")[0] || "User";

      const { data: created, error: createError } = await supabase
        .from("users")
        .insert([
          {
            id: authUser.id,
            email: authUser.email,
            full_name: fullName,
            role: "patient",
          },
        ])
        .select("id, email, full_name, phone, role")
        .single();

      if (createError) {
        console.error(
          `[auth] google profile creation failed for ${authUser.email}: ${createError.message}`
        );
        return res.status(500).json({
          message: "Signed in with Google, but profile creation failed.",
          error: createError.message,
        });
      }
      profile = created;
      console.log(`[auth] google sign-up: new profile for ${authUser.email}`);
    } else {
      console.log(`[auth] google login: ${authUser.email}`);
    }

    return res.status(200).json({
      message: "Google sign-in successful.",
      user: profile,
      session: data.session,
      access_token: data.session.access_token,
    });
  } catch (err) {
    console.error("[auth] google sign-in error:", err.message);
    return res.status(500).json({
      message: "Server error.",
      error: err.message,
    });
  }
};

// ============================================================
// CHANGE PASSWORD — authenticated, used for forced first-login change
// ============================================================
// POST /api/auth/change-password   body: { password }   (auth required)
//
// The user is already authenticated (authMiddleware sets req.user), so we
// update their password with the service_role admin client and clear the
// must_change_password flag. Used by the first-login gate for doctors the
// admin onboarded with a temporary password.
const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      { password }
    );
    if (updateError) {
      return res.status(400).json({
        message: "Could not change password.",
        error: updateError.message,
      });
    }

    // Clear the forced-change flag now that they've set their own password.
    const { error: flagError } = await supabase
      .from("users")
      .update({ must_change_password: false })
      .eq("id", userId);
    if (flagError) {
      console.error(
        `[auth] cleared password but failed to reset flag for ${userId}: ${flagError.message}`
      );
    }

    return res.status(200).json({ message: "Password changed." });
  } catch (err) {
    return res.status(500).json({ message: "Server error.", error: err.message });
  }
};

module.exports = {
  login,
  register,
  forgotPassword,
  resetPassword,
  googleSignIn,
  changePassword,
};