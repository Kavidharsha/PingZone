require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");

const userRoutes = require("./routes/userRoutes");
const messageRoutes = require("./routes/messageRoutes");
const aiRoutes = require("./routes/aiRoutes");

const app = express();

const corsOptions = {
  origin: (origin, callback) => {
    if (
      !origin ||
      origin === "http://localhost:5173" ||
      /^https:\/\/.*\.vercel\.app$/.test(origin)
    ) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "DELETE", "PUT", "PATCH", "OPTIONS"],
};

// HTTP server
const server = http.createServer(app);

// Socket.IO server
const io = new Server(server, {
  cors: corsOptions,
});

// Middleware
app.use(cors(corsOptions));

app.use(express.json());

// API routes
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/ai", aiRoutes);

// Test route
app.get("/", (req, res) => {
  res.json({
    message: "PingZone server is running 🚀",
  });
});

// =========================
// ONLINE USERS
// =========================

const onlineUsers = new Map();

// =========================
// SOCKET.IO
// =========================

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("typing", (data) => {
    socket.to(data.chatKey).emit("typing", data);
  });
  
  socket.on("stop_typing", (data) => {
    socket
      .to(data.chatKey)
      .emit("stop_typing", data);
  });

  // User comes online
  socket.on("user_online", (userId) => {
    if (!userId) return;
  
    const id = String(userId);
  
    onlineUsers.set(id, socket.id);
  
    socket.join(`user_${id}`);
  
    console.log(
      `User ${id} is online`
    );
  
    io.emit(
      "online_users",
      [...onlineUsers.keys()]
    );
  });

  // Join a chat room
  socket.on("join_chat", (chatKey) => {
    socket.join(chatKey);

    console.log(
      `Socket ${socket.id} joined: ${chatKey}`
    );
  });

  // Leave a chat room
  socket.on("leave_chat", (chatKey) => {
    socket.leave(chatKey);

    console.log(
      `Socket ${socket.id} left: ${chatKey}`
    );
  });

  // Real-time message
  socket.on("send_message", (data) => {
    const {
      chatKey,
      message,
    } = data;
  
    // Private message
    if (message.receiverId) {
      io
        .to(`user_${message.receiverId}`)
        .emit(
          "receive_message",
          message
        );
    } else {
      // Public channel message
      socket
        .to(chatKey)
        .emit(
          "receive_message",
          message
        );
    }
  });

  // User disconnects
  socket.on("disconnect", () => {
    let disconnectedUserId = null;

    for (const [
      userId,
      socketId,
    ] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        disconnectedUserId = userId;
        onlineUsers.delete(userId);
        break;
      }
    }

    console.log(
      "User disconnected:",
      socket.id
    );

    if (disconnectedUserId) {
      io.emit(
        "online_users",
        [...onlineUsers.keys()]
      );
    }
  });
});

// Connect MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected ✅");

    const PORT = process.env.PORT || 5000;

    server.listen(PORT, () => {
      console.log(
        `PingZone server running on port ${PORT}`
      );
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed ❌");
    console.error(error.message);
  });