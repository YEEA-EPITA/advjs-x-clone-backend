const socketIO = require("socket.io");

let io;

module.exports = {
  init: (server) => {
    io = socketIO(server, {
      cors: {
        origin: ["http://localhost:3000"], // your frontend URL
        methods: ["GET", "POST"],
        credentials: true,
      },
    });
    return io;
  },
  getIO: () => {
    if (!io) throw new Error("Socket.io not initialized");
    return io;
  },
};
