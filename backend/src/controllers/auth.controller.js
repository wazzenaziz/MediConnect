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

const register = async (req, res) => {
  try {
    const { full_name, email, password, phone } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({
        message: "full_name, email, and password are required.",
      });
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
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

module.exports = {
  login,
  register,
};