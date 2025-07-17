const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const User = require("../models/User");
const {
  authSuccessView,
  userDataView,
  successView,
  errorView,
  validationErrorView,
} = require("../views/authViews");

// In-memory token blacklist (in production, use Redis or database)
const blacklistedTokens = new Set();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

// Add token to blacklist
const blacklistToken = (token) => {
  blacklistedTokens.add(token);
};

// Check if token is blacklisted
const isTokenBlacklisted = (token) => {
  return blacklistedTokens.has(token);
};

// Register user
exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(validationErrorView(errors));
    }

    const { username, email, password, displayName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      const errorMessage =
        existingUser.email === email
          ? "Email already registered"
          : "Username already taken";
      return res.status(400).json(errorView(errorMessage, 400));
    }

    // Create new user
    const user = new User({
      username,
      email,
      password,
      displayName,
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Send response using view
    res
      .status(201)
      .json(authSuccessView("User registered successfully", token, user));
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json(errorView("Server error during registration"));
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // Update last active
    user.lastActive = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Send response
    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error during login" });
  }
};

// Logout user with token blacklisting
exports.logout = async (req, res) => {
  try {
    // Extract token from Authorization header
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    // Add token to blacklist
    blacklistToken(token);

    res.json({
      message: "Logged out successfully",
      note: "Token has been invalidated",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Server error during logout" });
  }
};

// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      message: "User retrieved successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        bio: user.bio,
        profilePicture: user.profilePicture,
        coverPicture: user.coverPicture,
        isVerified: user.isVerified,
        isPrivate: user.isPrivate,
        location: user.location,
        website: user.website,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({ error: "Server error retrieving user" });
  }
};

// Refresh token (simplified - just generate new token)
exports.refreshToken = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.substring(7);

    // Check if token is blacklisted
    if (isTokenBlacklisted(token)) {
      return res
        .status(401)
        .json({ error: "Token has been revoked. Please login again." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Blacklist the old token
    blacklistToken(token);

    // Generate new token
    const newToken = generateToken(decoded.userId);

    res.json({
      message: "Token refreshed successfully",
      token: newToken,
      note: "Old token has been invalidated",
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ error: "Token expired. Please login again." });
    }
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

// Update password
exports.updatePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Update password error:", error);
    res.status(500).json({ error: "Server error updating password" });
  }
};

// Export blacklist checker for use in middleware
module.exports.isTokenBlacklisted = isTokenBlacklisted;
