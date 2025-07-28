const express = require("express");
const { body, query, param } = require("express-validator");
const { postsController } = require("../controllers");
const { authMiddleware } = require("../middlewares");

const router = express.Router();

// Create a new post
router.post(
  "/",
  authMiddleware,
  [
    body("content")
      .isLength({ min: 1, max: 2000 })
      .withMessage("Content must be between 1 and 2000 characters"),
    body("contentType")
      .optional()
      .isIn(["text", "image", "video", "link"])
      .withMessage("Invalid content type"),
    body("mediaUrls")
      .optional()
      .isArray()
      .withMessage("Media URLs must be an array"),
    body("location")
      .optional()
      .isLength({ max: 100 })
      .withMessage("Location must not exceed 100 characters"),
  ],
  postsController.createPost
);

// Get user's personalized feed
router.get(
  "/feed",
  authMiddleware,
  [
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
    query("offset")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Offset must be non-negative"),
  ],
  postsController.getUserFeed
);

// Search posts with advanced filtering
router.get(
  "/search",
  [
    query("q")
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage("Search query must be between 1 and 100 characters"),
    query("type")
      .optional()
      .isIn(["text", "image", "video", "link"])
      .withMessage("Invalid content type filter"),
    query("from")
      .optional()
      .isISO8601()
      .withMessage("From date must be a valid ISO 8601 date"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
  ],
  postsController.searchPosts
);

// Get trending hashtags
router.get(
  "/trending/hashtags",
  [
    query("limit")
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage("Limit must be between 1 and 50"),
    query("hours")
      .optional()
      .isInt({ min: 1, max: 168 })
      .withMessage("Hours must be between 1 and 168 (7 days)"),
  ],
  postsController.getTrendingHashtags
);

// Like a post
router.post(
  "/:postId/like",
  authMiddleware,
  [param("postId").isUUID().withMessage("Post ID must be a valid UUID")],
  postsController.likePost
);

// Retweet a post
router.post(
  "/:postId/retweet",
  authMiddleware,
  [
    param("postId").isUUID().withMessage("Post ID must be a valid UUID"),
    body("comment")
      .optional()
      .isLength({ max: 280 })
      .withMessage("Comment must not exceed 280 characters"),
  ],
  postsController.retweetPost
);

// Get detailed post analytics
router.get(
  "/:postId/analytics",
  authMiddleware,
  [param("postId").isUUID().withMessage("Post ID must be a valid UUID")],
  postsController.getPostAnalytics
);

module.exports = router;
