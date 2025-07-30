const express = require("express");
const { body, param, query } = require("express-validator");
const router = express.Router();
const { authMiddleware } = require("../middlewares");
const { usersController } = require("../controllers");

// Update user profile
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

// Get user public profile
router.get(
  "/:userId/profile",
  [param("userId").isMongoId().withMessage("Invalid user ID")],
  usersController.getUserProfile
);

// Follow a user
router.post(
  "/:userId/follow",
  authMiddleware,
  [param("userId").isMongoId().withMessage("Invalid user ID")],
  usersController.followUser
);

// Unfollow a user
router.delete(
  "/:userId/follow",
  authMiddleware,
  [param("userId").isMongoId().withMessage("Invalid user ID")],
  usersController.unfollowUser
);

// Get user's followers
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

// Get user's following
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
