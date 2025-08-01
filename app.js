const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const connectMongoDB = require("./config/mongodb");
const { connectPostgreSQL } = require("./config/postgresql");
const {
  authRoutes,
  postsRoutes,
  usersRoutes,
  pollRoutes,
} = require("./routes");
const {
  healthCheckView,
  apiInfoView,
  notFoundView,
} = require("./views/systemViews");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");

const app = express();

// Database connections (MongoDB for auth, PostgreSQL for posts/analytics)
const initializeDatabases = async () => {
  try {
    // Initialize MongoDB for user authentication
    await connectMongoDB();
    console.log("✅ MongoDB initialized successfully");

    // Try to initialize PostgreSQL for posts, relationships, and analytics
    try {
      await connectPostgreSQL();
      console.log("✅ PostgreSQL initialized successfully");
    } catch (pgError) {
      console.warn(
        "⚠️  PostgreSQL connection failed, posts endpoints may not work"
      );
      console.error("PostgreSQL error:", pgError.message);
    }

    console.log("✅ Database initialization completed");
  } catch (error) {
    console.warn("⚠️  Database connection failed");
    console.error("Database error:", error.message);
    // Don't exit, let the server run but warn about database issues
  }
}; // Initialize databases
initializeDatabases();

// Security middleware
app.use(helmet());

// Dynamic CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // In development, allow any localhost port
    if (process.env.NODE_ENV === "development") {
      const localhostRegex = /^https?:\/\/(localhost|127\.0\.0\.1):(\d+)$/;
      if (localhostRegex.test(origin)) {
        return callback(null, true);
      }
    }

    // In production, only allow specific origins
    const allowedOrigins = process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",")
      : ["http://localhost:3000", "http://localhost:3001"];

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api/", limiter);

// General middleware
app.use(compression());
app.use(morgan("combined"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Routes - Authentication (MongoDB), Posts (PostgreSQL), and Users (MongoDB)
const generalsearchRoutes = require("./routes/generalsearch.routes");
app.use("/api/auth", authRoutes);
app.use("/api/posts", postsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/polls", pollRoutes);
app.use("/api", generalsearchRoutes);

// Swagger API Docs route
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json(healthCheckView());
});

// API info endpoint
app.get("/api/info", (req, res) => {
  res.status(200).json(apiInfoView());
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

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json(notFoundView(req.originalUrl, req.method));
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
