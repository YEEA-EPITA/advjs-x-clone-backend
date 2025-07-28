const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const http = require("http");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

// Basic middleware
app.use(helmet());
app.use(compression());
app.use(morgan("combined"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api/", limiter);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    message: "Twitter Clone Backend API is running!",
  });
});

// Basic info endpoint
app.get("/api/info", (req, res) => {
  res.json({
    name: "Twitter Clone Backend API",
    version: "1.0.0",
    description: "A comprehensive backend API for a Twitter/X clone",
    features: [
      "User Authentication",
      "Posts & Content Management",
      "Polls System",
      "Real-time Updates",
      "User Management",
      "Analytics & Trends",
    ],
    endpoints: {
      auth: "/api/auth",
      users: "/api/users",
      posts: "/api/posts",
      polls: "/api/polls",
      notifications: "/api/notifications",
    },
  });
});

// Test endpoint
app.get("/api/test", (req, res) => {
  res.json({
    message: "API test endpoint working!",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || "development",
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Something went wrong!",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
  });
});

// 404 handler - must be last
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API info: http://localhost:${PORT}/api/info`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/test`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || "development"}`);
});

module.exports = app;
