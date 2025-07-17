const request = require("supertest");
const app = require("../src/app");
const User = require("../src/models/User");
const mongoose = require("mongoose");

describe("Authentication Endpoints", () => {
  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(
      process.env.MONGODB_TEST_URI || "mongodb://localhost:27017/twitter_test"
    );
  });

  afterAll(async () => {
    // Clean up and close connection
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clean up before each test
    await User.deleteMany({});
  });

  describe("POST /api/auth/register", () => {
    it("should register a new user successfully", async () => {
      const userData = {
        username: "testuser",
        email: "test@example.com",
        password: "password123",
        displayName: "Test User",
      };

      const response = await request(app)
        .post("/api/auth/register")
        .send(userData)
        .expect(201);

      expect(response.body.message).toBe("User registered successfully");
      expect(response.body.user.username).toBe("testuser");
      expect(response.body.user.email).toBe("test@example.com");
      expect(response.body.token).toBeDefined();
    });

    it("should return error for duplicate username", async () => {
      const userData = {
        username: "testuser",
        email: "test@example.com",
        password: "password123",
        displayName: "Test User",
      };

      // Create first user
      await request(app).post("/api/auth/register").send(userData).expect(201);

      // Try to create another user with same username
      const duplicateData = {
        ...userData,
        email: "different@example.com",
      };

      const response = await request(app)
        .post("/api/auth/register")
        .send(duplicateData)
        .expect(400);

      expect(response.body.error).toBe("Username already exists");
    });

    it("should return validation errors for invalid data", async () => {
      const invalidData = {
        username: "ab", // Too short
        email: "invalid-email",
        password: "123", // Too short
        displayName: "",
      };

      const response = await request(app)
        .post("/api/auth/register")
        .send(invalidData)
        .expect(400);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.length).toBeGreaterThan(0);
    });
  });

  describe("POST /api/auth/login", () => {
    beforeEach(async () => {
      // Create a test user
      const userData = {
        username: "testuser",
        email: "test@example.com",
        password: "password123",
        displayName: "Test User",
      };

      await request(app).post("/api/auth/register").send(userData);
    });

    it("should login user successfully", async () => {
      const loginData = {
        email: "test@example.com",
        password: "password123",
      };

      const response = await request(app)
        .post("/api/auth/login")
        .send(loginData)
        .expect(200);

      expect(response.body.message).toBe("Login successful");
      expect(response.body.user.username).toBe("testuser");
      expect(response.body.token).toBeDefined();
    });

    it("should return error for invalid credentials", async () => {
      const loginData = {
        email: "test@example.com",
        password: "wrongpassword",
      };

      const response = await request(app)
        .post("/api/auth/login")
        .send(loginData)
        .expect(401);

      expect(response.body.error).toBe("Invalid credentials");
    });

    it("should return error for non-existent user", async () => {
      const loginData = {
        email: "nonexistent@example.com",
        password: "password123",
      };

      const response = await request(app)
        .post("/api/auth/login")
        .send(loginData)
        .expect(401);

      expect(response.body.error).toBe("Invalid credentials");
    });
  });

  describe("GET /api/auth/me", () => {
    let token;

    beforeEach(async () => {
      // Create and login a test user
      const userData = {
        username: "testuser",
        email: "test@example.com",
        password: "password123",
        displayName: "Test User",
      };

      const registerResponse = await request(app)
        .post("/api/auth/register")
        .send(userData);

      token = registerResponse.body.token;
    });

    it("should get current user successfully", async () => {
      const response = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(response.body.username).toBe("testuser");
      expect(response.body.email).toBe("test@example.com");
      expect(response.body.password).toBeUndefined();
    });

    it("should return error without token", async () => {
      const response = await request(app).get("/api/auth/me").expect(401);

      expect(response.body.error).toBe("Access denied. No token provided.");
    });

    it("should return error with invalid token", async () => {
      const response = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer invalid-token")
        .expect(401);

      expect(response.body.error).toBe("Invalid token.");
    });
  });
});

describe("Health Check", () => {
  it("should return health status", async () => {
    const response = await request(app).get("/health").expect(200);

    expect(response.body.status).toBe("OK");
    expect(response.body.timestamp).toBeDefined();
  });
});

describe("404 Handler", () => {
  it("should return 404 for non-existent routes", async () => {
    const response = await request(app).get("/non-existent-route").expect(404);

    expect(response.body.error).toBe("Route not found");
  });
});
