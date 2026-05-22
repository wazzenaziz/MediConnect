// Thin singleton around the socket.io server instance so controllers
// can emit events without having to import the http server. The actual
// `Server` is constructed in server.js (which is where the http listen
// lives); this module just holds the reference and exposes safe helpers.

let ioInstance = null;

const setIO = (io) => {
  ioInstance = io;
};

const getIO = () => ioInstance;

/**
 * Emit `event` with `payload` to all sockets in `room`.
 * No-op if socket.io hasn't been initialized yet (e.g. unit tests that
 * import a controller without booting the server). Controllers should
 * NOT have their HTTP response blocked by socket failures, so we also
 * swallow any throw from the emit itself.
 */
const emitTo = (room, event, payload) => {
  if (!ioInstance) return;
  try {
    ioInstance.to(room).emit(event, payload);
  } catch (err) {
    console.error("[socket] emit failed:", err.message);
  }
};

module.exports = { setIO, getIO, emitTo };
