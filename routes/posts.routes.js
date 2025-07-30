const express = require("express");
const { body } = require("express-validator");
const { postsController } = require("../controllers");
const {
  authMiddleware,
  validateSchemaMiddleware,
  uploadMiddleware,
} = require("../middlewares");
const { postsSchema } = require("../schemas");

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  uploadMiddleware.uploadSingle("media"),
  validateSchemaMiddleware({ body: postsSchema.createPostSchema }),
  postsController.createPost
);

router.get(
  "/live-feeds",
  // No auth required, public endpoint
  postsController.getLiveFeeds
);

router.get(
  "/feed",
  authMiddleware,
  validateSchemaMiddleware({ query: postsSchema.userFeedQuerySchema }),
  postsController.getUserFeed
);

router.get(
  "/search",
  validateSchemaMiddleware({ query: postsSchema.searchPostsQuerySchema }),
  postsController.searchPosts
);

router.get(
  "/trending/hashtags",
  validateSchemaMiddleware({ query: postsSchema.trendingHashtagsQuerySchema }),
  postsController.getTrendingHashtags
);

router.post(
  "/:postId/like",
  authMiddleware,
  validateSchemaMiddleware({ params: postsSchema.likePostParamsSchema }),
  postsController.likePost
);

router.post(
  "/:postId/retweet",
  authMiddleware,
  validateSchemaMiddleware({
    params: postsSchema.retweetPostParamsSchema,
    body: postsSchema.retweetPostBodySchema,
  }),
  postsController.retweetPost
);

router.get(
  "/:postId/analytics",
  authMiddleware,
  validateSchemaMiddleware({ params: postsSchema.postAnalyticsParamsSchema }),
  postsController.getPostAnalytics
);

// Add a comment to a post
router.post(
  "/:postId/comments",
  authMiddleware,
  [
    body("content")
      .isLength({ min: 1, max: 1000 })
      .withMessage("Comment must be between 1 and 1000 characters"),
  ],
  postsController.addComment
);

// Get polls for a post
router.get("/:postId/polls", postsController.getPollByPost);

// Get comments for a post
router.get("/:postId/comments", postsController.getComments);

module.exports = router;
