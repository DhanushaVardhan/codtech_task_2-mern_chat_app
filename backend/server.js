const path = require("path");
const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const colors = require("colors");
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

// Environment Configuration
dotenv.config();
connectDB();

const app = express();
app.use(express.json()); // Parse incoming JSON data

// API Routes
app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);

// Deployment Settings
const __dirname1 = path.resolve();
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname1, "/frontend/build")));
  app.get("*", (req, res) =>
    res.sendFile(path.resolve(__dirname1, "frontend", "build", "index.html"))
  );
} else {
  app.get("/", (req, res) => {
    res.send("API is running...");
  });
}

// Error Handlers
app.use(notFound);
app.use(errorHandler);

// Server Initialization
const PORT = process.env.PORT || 5000;
const server = app.listen(
  PORT,
  console.log(`Server started on port ${PORT}`.yellow.bold)
);

// Socket.IO Setup
const io = require("socket.io")(server, {
  pingTimeout: 60000, // Default: 1 minute
  cors: {
    origin: "http://localhost:3000", // Update to production frontend URL
    credentials: true,
  },
});

// Socket.IO Events
io.on("connection", (socket) => {
  console.log("Connected to socket.io");

  // User Setup
  socket.on("setup", (userData) => {
    if (!userData?._id) return; // Ensure userData exists
    socket.join(userData._id);
    console.log(`${userData.name} connected`);
    socket.emit("connected");
  });

  // Joining a Chat
  socket.on("join chat", (room) => {
    socket.join(room);
    console.log("User joined chat: " + room);
  });

  // Typing Indicators
  socket.on("typing", (data) => {
    if (data?.chatId) {
      socket.broadcast.to(data.chatId).emit("showTyping", data);
    }
  });

  socket.on("stopTyping", (data) => {
    if (data?.chatId) {
      socket.broadcast.to(data.chatId).emit("hideTyping", data);
    }
  });

  // Message Handling
  socket.on("new message", (newMessageReceived) => {
    const chat = newMessageReceived?.chat;

    if (!chat?.users) return console.log("chat.users not defined");

    chat.users.forEach((user) => {
      if (user._id === newMessageReceived.sender._id) return;
      socket.in(user._id).emit("message received", newMessageReceived);
    });
  });

  // User Disconnect
  socket.on("disconnect", () => {
    console.log("USER DISCONNECTED");
  });

  // Cleanup when a user disconnects
  socket.off("setup", (userData) => {
    if (userData?._id) {
      console.log(`${userData.name} disconnected`);
      socket.leave(userData._id);
    }
  });
});
