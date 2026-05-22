const http = require("http");
const app = require("./app");
const { initSocket } = require("./sockets");

const PORT = process.env.PORT || 5000;

// Wrap Express in a raw http.Server so socket.io can attach. Express's
// app.listen() returns the same kind of object under the hood, but
// constructing it explicitly here keeps the socket attachment clean.
const httpServer = http.createServer(app);
initSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (HTTP + WebSocket)`);
});
