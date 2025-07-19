/**
 * System Response Views
 *
 * Views for system-level endpoints like health checks
 */

// Health check response
const healthCheckView = () => {
  return {
    status: "OK",
    message: "Twitter Clone Full-Stack API is running",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    services: {
      databases: {
        mongodb: "User Authentication & Profiles",
        postgresql: "Posts, Analytics & Relationships",
      },
      authentication: "JWT with token blacklisting",
      features: "Dual-database architecture",
    },
  };
};

// API info response
const apiInfoView = () => {
  return {
    name: "Twitter Clone Full-Stack API",
    version: "1.0.0",
    description:
      "Complete social media backend with dual-database architecture",
    architecture: {
      databases: {
        mongodb: "User authentication, profiles, and flexible data",
        postgresql: "Posts, relationships, analytics, and complex queries",
      },
      pattern: "MVC (Model-View-Controller)",
    },
    endpoints: {
      authentication: [
        "POST /api/auth/register",
        "POST /api/auth/login",
        "POST /api/auth/logout",
        "POST /api/auth/refresh",
        "GET /api/auth/me",
        "PUT /api/auth/password",
      ],
      posts: [
        "POST /api/posts",
        "GET /api/posts/feed",
        "GET /api/posts/search",
        "GET /api/posts/trending/hashtags",
        "POST /api/posts/:postId/like",
        "GET /api/posts/:postId/analytics",
      ],
      system: ["GET /health", "GET /api/info"],
    },
    features: [
      "JWT Authentication with token blacklisting",
      "Complex SQL queries and joins",
      "Real-time trending hashtags",
      "Advanced search and filtering",
      "User engagement analytics",
      "Dual-database optimization",
    ],
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
      "POST /api/posts",
      "GET /api/posts/feed",
      "GET /api/posts/search",
      "GET /api/posts/trending/hashtags",
      "POST /api/posts/:postId/like",
      "GET /api/posts/:postId/analytics",
    ],
    timestamp: new Date().toISOString(),
  };
};

module.exports = {
  healthCheckView,
  apiInfoView,
  notFoundView,
};
