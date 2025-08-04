const express = require("express");
const { authMiddleware, validateSchemaMiddleware } = require("../middlewares");
const { usersController, authController } = require("../controllers");
const { authSchema } = require("../schemas");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication and User Management
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterInput'
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error
 */
router.post(
  "/register",
  validateSchemaMiddleware({ body: authSchema.registerSchema }),
  authController.register
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login a user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginInput'
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post(
  "/login",
  validateSchemaMiddleware({ body: authSchema.loginSchema }),
  authController.login
);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout the current user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post("/logout", authMiddleware, authController.logout);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token using refresh token
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 */
router.post("/refresh", authController.refreshToken);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get the currently authenticated user's info
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User info retrieved
 */
router.get("/me", authMiddleware, authController.getCurrentUser);

/**
 * @swagger
 * /auth/password:
 *   put:
 *     summary: Update user password
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePasswordInput'
 *     responses:
 *       200:
 *         description: Password updated successfully
 */
router.put(
  "/password",
  authMiddleware,
  validateSchemaMiddleware({ body: authSchema.updatePasswordSchema }),
  authController.updatePassword
);

/**
 * @swagger
 * /auth/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileInput'
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.put(
  "/profile",
  authMiddleware,
  validateSchemaMiddleware({ body: authSchema.updateProfileSchema }),
  usersController.updateProfile
);

module.exports = router;
