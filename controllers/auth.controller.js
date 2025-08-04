const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const { UserModels } = require("../models");
const { ErrorFactory, ResponseFactory } = require("../factories");

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
    const { username, email, password, displayName } = req.body;

    // Check if user already exists
    const existingUser = await UserModels.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      const errorMessage =
        existingUser.email === email
          ? "Email already registered"
          : "Username already taken";
      return ErrorFactory.conflict({
        res,
        message: errorMessage,
      });
    }

    // Create new user
    const user = new UserModels({
      username,
      email,
      password,
      displayName,
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Send response using view
    return ResponseFactory.authSuccess({
      res,
      token,
      user,
      message: "User registered successfully",
    });
  } catch (error) {
    return ErrorFactory.internalServerError({
      res,
      message: "Server error during registration",
    });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await UserModels.findOne({ email });
    if (!user)
      return ErrorFactory.unauthorized({ res, message: "Invalid credentials" });

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch)
      return ErrorFactory.unauthorized({ res, message: "Invalid credentials" });

    // Update last active
    user.lastActive = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Send response
    return ResponseFactory.authSuccess({
      res,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
      message: "Login successful",
    });
  } catch (error) {
    return ErrorFactory.internalServerError({
      res,
      message: "Server error during login",
    });
  }
};

// Logout user with token blacklisting
exports.logout = async (req, res) => {
  try {
    // Extract token from Authorization header
    const token = req.header("Authorization")?.replace("Bearer ", "");

    // Add token to blacklist
    blacklistToken(token);

    return ResponseFactory.accepted({
      res,
      message: "Logged out successfully",
    });
  } catch (error) {
    return ErrorFactory.internalServerError({
      res,
      message: "Server error during logout",
    });
  }
};

// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await UserModels.findById(req.user._id).select("-password");

    if (!user) {
      return ErrorFactory.notFound({
        res,
        message: "User not found",
      });
    }

    return ResponseFactory.success({
      res,
      message: "User retrieved successfully",
      data: {
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
    return ErrorFactory.internalServerError({
      res,
      message: "Failed to retrieve user",
    });
  }
};

// Refresh token (simplified - just generate new token)
exports.refreshToken = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return ErrorFactory.unauthorized({
        res,
        message: "No token provided",
      });
    }

    const token = authHeader.substring(7);

    // Check if token is blacklisted
    if (isTokenBlacklisted(token)) {
      return ErrorFactory.unauthorized({
        res,
        message: "Token has been revoked. Please login again.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Blacklist the old token
    blacklistToken(token);

    // Generate new token
    const newToken = generateToken(decoded.userId);

    return ResponseFactory.success({
      res,
      message: "Token refreshed successfully",
      data: {
        token: newToken,
        note: "Old token has been invalidated",
      },
    });
  } catch (error) {
    return ErrorFactory.unauthorized({
      res,
      message: "Invalid or expired token",
    });
  }
};

// Update password
exports.updatePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ErrorFactory.badRequest({
        res,
        message: "Validation failed",
        data: { errors: errors.array() },
      });
    }
  } catch (error) {
    return ErrorFactory.internalServerError({
      res,
      message: "Server error during password update",
    });
  }
};

// Update password
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await UserModels.findById(req.user._id);

    if (!user) {
      return ErrorFactory.notFound({
        res,
        message: "User not found",
      });
    }

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return ErrorFactory.badRequest({
        res,
        message: "Current password is incorrect",
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    return ResponseFactory.success({
      res,
      message: "Password updated successfully",
    });
  } catch (error) {
    return ErrorFactory.internalServerError({
      res,
      message: "Server error updating password",
    });
  }
};

// Export blacklist checker for use in middleware
module.exports.isTokenBlacklisted = isTokenBlacklisted;
