const supabase = require("../config/supabase");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "Access denied. No token provided.",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Access denied. Invalid token format.",
      });
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        message: "Invalid or expired token.",
      });
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id, full_name, email, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({
        message: "User profile not found.",
      });
    }

    req.user = profile;

    next();
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

module.exports = authMiddleware;