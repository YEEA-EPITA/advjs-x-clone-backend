const express = require("express");
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

module.exports = router;
