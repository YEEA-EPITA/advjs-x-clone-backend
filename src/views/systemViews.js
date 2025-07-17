/**
 * System Response Views
 *
 * Views for system-level endpoints like health checks
 */

// Health check response
const healthCheckView = () => {
  return {
    status: "OK",
    message: "Twitter Clone Auth API is running",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    services: {
      database: "MongoDB",
      authentication: "JWT",
    },
  };
};

// API info response
const apiInfoView = () => {
  return {
    name: "Twitter Clone Authentication API",
    version: "1.0.0",
    description: "Authentication microservice for Twitter/X clone",
    endpoints: {
      authentication: [
        "POST /api/auth/register",
        "POST /api/auth/login",
        "POST /api/auth/logout",
        "POST /api/auth/refresh",
        "GET /api/auth/me",
        "PUT /api/auth/password",
      ],
      system: ["GET /health", "GET /api/info"],
    },
    documentation: {
      postman: "Available in repository",
      readme: "See README.md for detailed documentation",
    },
    timestamp: new Date().toISOString(),
  };
};

// 404 Not Found response
const notFoundView = (path, method) => {
  return {
    success: false,
    error: "Route not found",
    statusCode: 404,
    path,
    method,
    message: "The requested endpoint does not exist",
    availableEndpoints: [
      "GET /health",
      "GET /api/info",
      "POST /api/auth/register",
      "POST /api/auth/login",
      "POST /api/auth/logout",
      "POST /api/auth/refresh",
      "GET /api/auth/me",
      "PUT /api/auth/password",
    ],
    timestamp: new Date().toISOString(),
  };
};

module.exports = {
  healthCheckView,
  apiInfoView,
  notFoundView,
};
