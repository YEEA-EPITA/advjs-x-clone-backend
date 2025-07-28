const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Basic middleware
app.use(express.json());
app.use(cors());

// Test route
app.get("/", (req, res) => {
  res.json({
    message: "Twitter Clone Auth API",
    status: "running",
    endpoints: [
      "GET /health",
      "POST /api/auth/register",
      "POST /api/auth/login",
      "POST /api/auth/logout",
      "POST /api/auth/refresh",
      "GET /api/auth/me",
      "PUT /api/auth/password",
    ],
  });
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Simple test auth route
app.post("/api/auth/test", (req, res) => {
  res.json({ message: "Auth route working!", body: req.body });
});

// Try to load auth routes
try {
  const authRoutes = require("./src/routes/auth");
  app.use("/api/auth", authRoutes);
  console.log("✅ Auth routes loaded successfully");
} catch (error) {
  console.error("❌ Failed to load auth routes:", error.message);
}

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
    method: req.method,
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Test server running on port ${PORT}`);
  console.log(`🔗 Try: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth test: http://localhost:${PORT}/api/auth/test`);
  console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth/*`);
});
