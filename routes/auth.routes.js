const express = require("express");
const { authMiddleware, validateSchemaMiddleware } = require("../middlewares");
const { usersController, authController } = require("../controllers");
const { authSchema } = require("../schemas");

const router = express.Router();

// Register
router.post(
  "/register",
  validateSchemaMiddleware({ body: authSchema.registerSchema }),
  authController.register
);

// Login
router.post(
  "/login",
  validateSchemaMiddleware({ body: authSchema.loginSchema }),
  authController.login
);

// Logout
router.post("/logout", authMiddleware, authController.logout);

// Refresh token
router.post("/refresh", authController.refreshToken);

// Get current user
router.get("/me", authMiddleware, authController.getCurrentUser);

// Update password
router.put(
  "/password",
  authMiddleware,
  validateSchemaMiddleware({ body: authSchema.updatePasswordSchema }),
  authController.updatePassword
);

// Update profile
router.put(
  "/profile",
  authMiddleware,
  validateSchemaMiddleware({ body: authSchema.updateProfileSchema }),
  usersController.updateProfile
);

// Update profile
router.put(
  "/profile",
  authMiddleware,
  validateSchemaMiddleware({ body: authSchema.updateProfileSchema }),
  usersController.updateProfile
);

// Update profile
router.put(
  "/profile",
  authMiddleware,
  validateSchemaMiddleware({ body: authSchema.updateProfileSchema }),
  usersController.updateProfile
);

module.exports = router;
