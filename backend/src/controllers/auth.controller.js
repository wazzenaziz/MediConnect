const supabase = require("../config/supabase");

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({
        message: "Invalid email or password.",
        error: error.message,
      });
    }

    return res.status(200).json({
      message: "Login successful.",
      user: data.user,
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

module.exports = {
  login,
};