const { Server } = require("socket.io");
const supabase = require("../config/supabase");
const { setIO } = require("../config/io");

/**
 * Initialize the socket.io server on top of an existing http.Server.
 *
 * Auth model:
 *   - Client must send a Supabase access token in the `auth.token` field
 *     of the connection handshake.
 *   - We verify the token via supabase.auth.getUser, then look up the
 *     user's role in our `users` table (same as authMiddleware does).
 *   - On success the socket joins three rooms:
 *       user:<userId>         direct messages to this user
 *       role:<role>           broadcasts to all patients / all doctors
 *       (doctors also join)   doctor:<doctorId> for slot-picker fanout
 *
 * Rooms used elsewhere in the codebase:
 *   - user:<userId>          targeted by appointment created / cancelled
 *   - doctor:<doctorId>      targeted when this doctor's slot state changes
 */
function initSocket(httpServer) {
  const allowedOrigins =
    process.env.NODE_ENV === "production"
      ? [process.env.FRONTEND_URL]
      : [/^http:\/\/localhost:\d+$/];

  const io = new Server(httpServer, {
    cors: { origin: allowedOrigins, credentials: true },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("No token provided"));

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token);
      if (error || !user) return next(new Error("Invalid token"));

      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("id, full_name, role")
        .eq("id", user.id)
        .single();
      if (profileError || !profile) return next(new Error("Profile not found"));

      socket.data.user = profile;
      next();
    } catch (err) {
      next(new Error("Auth error: " + err.message));
    }
  });

  io.on("connection", async (socket) => {
    const { id: userId, role } = socket.data.user;
    socket.join(`user:${userId}`);
    socket.join(`role:${role}`);

    // Doctors also subscribe to their doctor:<doctorId> room so the
    // slot picker on other clients can update when their availability
    // changes. We look up the doctor row by user_id once at connect.
    if (role === "doctor") {
      const { data: doctorRow } = await supabase
        .from("doctors")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      if (doctorRow?.id) {
        socket.data.doctorId = doctorRow.id;
        socket.join(`doctor:${doctorRow.id}`);
      }
    }

    // Patients (and any client) can subscribe to a specific doctor's
    // slot-change events while viewing that doctor's profile / picker.
    socket.on("doctor:subscribe", (doctorId) => {
      if (typeof doctorId === "string" && doctorId.length < 64) {
        socket.join(`doctor:${doctorId}`);
      }
    });
    socket.on("doctor:unsubscribe", (doctorId) => {
      if (typeof doctorId === "string") {
        socket.leave(`doctor:${doctorId}`);
      }
    });

    socket.on("disconnect", () => {
      // socket.io leaves rooms automatically; no manual cleanup needed.
    });
  });

  setIO(io);
  return io;
}

module.exports = { initSocket };
