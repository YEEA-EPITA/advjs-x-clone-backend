const express = require("express");
const { body, param, query } = require("express-validator");
const router = express.Router();
const { authMiddleware } = require("../middlewares");
const { usersController } = require("../controllers");

/**
 * @swagger
 * /users/suggestions:
 *   get:
 *     summary: Get follow suggestions (users you don't already follow)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of suggested users
 */

router.get(
  "/suggestions",
  authMiddleware,
  require("../controllers/users.controller").getFollowSuggestions
);

/**
 * @swagger
 * /users/search:
 *   get:
 *     summary: Search users by username or displayName
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: true
 *         description: Search keyword
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         required: false
 *         description: Max number of results
 *     responses:
 *       200:
 *         description: User search results
 */
router.get(
  "/search",
  require("../controllers/search.controller.js").searchUsers
);

/**
 * @swagger
 * /users/profile:
 *   put:
 *     summary: Update authenticated user's profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserProfileInput'
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.put(
  "/profile",
  authMiddleware,
  [
    body("displayName")
      .optional()
      .isLength({ min: 1, max: 50 })
      .withMessage("Display name must be between 1 and 50 characters"),
    body("bio")
      .optional()
      .isLength({ max: 280 })
      .withMessage("Bio must not exceed 280 characters"),
    body("location")
      .optional()
      .isLength({ max: 100 })
      .withMessage("Location must not exceed 100 characters"),
    body("website")
      .optional()
      .isURL()
      .withMessage("Website must be a valid URL"),
  ],
  usersController.updateProfile
);

/**
 * @swagger
 * /users/{userId}/profile:
 *   get:
 *     summary: Get public profile of a user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: MongoDB User ID
 *     responses:
 *       200:
 *         description: Public profile retrieved
 */
router.get(
  "/:userId/profile",
  [param("userId").isMongoId().withMessage("Invalid user ID")],
  usersController.getUserProfile
);

/**
 * @swagger
 * /users/{userId}/follow:
 *   post:
 *     summary: Follow a user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID to follow
 *     responses:
 *       200:
 *         description: Successfully followed the user
 */
router.post(
  "/:userId/follow",
  authMiddleware,
  [param("userId").isMongoId().withMessage("Invalid user ID")],
  usersController.followUser
);

/**
 * @swagger
 * /users/{userId}/follow:
 *   delete:
 *     summary: Unfollow a user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID to unfollow
 *     responses:
 *       200:
 *         description: Successfully unfollowed the user
 */
router.delete(
  "/:userId/follow",
  authMiddleware,
  [param("userId").isMongoId().withMessage("Invalid user ID")],
  usersController.unfollowUser
);

/**
 * @swagger
 * /users/{userId}/followers:
 *   get:
 *     summary: Get followers of a user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Followers retrieved successfully
 */
router.get(
  "/:userId/followers",
  [
    param("userId").isMongoId().withMessage("Invalid user ID"),
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
  ],
  usersController.getFollowers
);

/**
 * @swagger
 * /users/{userId}/following:
 *   get:
 *     summary: Get following list of a user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Following list retrieved successfully
 */
router.get(
  "/:userId/following",
  [
    param("userId").isMongoId().withMessage("Invalid user ID"),
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
  ],
  usersController.getFollowing
);

module.exports = router;
