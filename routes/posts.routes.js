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

/**
 * @swagger
 * /posts:
 *   post:
 *     summary: Create a new post (with optional media and poll)
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               media:
 *                 type: string
 *                 format: binary
 *               content:
 *                 type: string
 *               location:
 *                 type: string
 *               poll:
 *                 type: string
 *                 example: '{"question": "Favorite frontend?", "options": ["React", "Vue", "Angular"], "expires_at": "2025-08-10T12:00:00Z"}'
 *     responses:
 *       201:
 *         description: Post created successfully
 *       400:
 *         description: Validation error
 */
router.post(
  "/",
  authMiddleware,
  uploadMiddleware.uploadSingle("media"),
  validateSchemaMiddleware({ body: postsSchema.createPostSchema }),
  postsController.createPost
);

/**
 * @swagger
 * /posts/feed:
 *   get:
 *     summary: Get posts from user feed
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of posts to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *         description: Offset for pagination
 *     responses:
 *       200:
 *         description: Feed retrieved successfully
 */
router.get("/live-feeds", authMiddleware, postsController.getLiveFeeds);

router.get(
  "/feed",
  authMiddleware,
  validateSchemaMiddleware({ query: postsSchema.userFeedQuerySchema }),
  postsController.getUserFeed
);

/**
 * @swagger
 * /posts/search:
 *   get:
 *     summary: Search posts by keyword
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search term
 *     responses:
 *       200:
 *         description: Search results
 */
router.get(
  "/search",
  validateSchemaMiddleware({ query: postsSchema.searchPostsQuerySchema }),
  postsController.searchPosts
);

/**
 * @swagger
 * /posts/trending/hashtags:
 *   get:
 *     summary: Get trending hashtags
 *     tags: [Posts]
 *     responses:
 *       200:
 *         description: Trending hashtags list
 */
router.get(
  "/trending/hashtags",
  validateSchemaMiddleware({ query: postsSchema.trendingHashtagsQuerySchema }),
  postsController.getTrendingHashtags
);

/**
 * @swagger
 * /posts/{postId}/like:
 *   post:
 *     summary: Like a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Post liked
 */
router.post(
  "/:postId/like",
  authMiddleware,
  validateSchemaMiddleware({ params: postsSchema.likePostParamsSchema }),
  postsController.likePost
);

/**
 * @swagger
 * /posts/{postId}/retweet:
 *   post:
 *     summary: Retweet a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               comment:
 *                 type: string
 *     responses:
 *       200:
 *         description: Retweet successful
 */
router.post(
  "/:postId/retweet",
  authMiddleware,
  validateSchemaMiddleware({
    params: postsSchema.retweetPostParamsSchema,
    body: postsSchema.retweetPostBodySchema,
  }),
  postsController.retweetPost
);

/**
 * @swagger
 * /posts/{postId}/analytics:
 *   get:
 *     summary: Get analytics for a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Post analytics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 analytics:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     content:
 *                       type: string
 *                     user_id:
 *                       type: string
 *                     username:
 *                       type: string
 *                     displayName:
 *                       type: string
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     like_count:
 *                       type: integer
 *                     retweet_count:
 *                       type: integer
 *                     comment_count:
 *                       type: integer
 *                     media_urls:
 *                       type: array
 *                       items:
 *                         type: string
 *                     total_engagement:
 *                       type: integer
 *                     unique_likers:
 *                       type: integer
 *                     unique_retweeters:
 *                       type: integer
 *                     recent_likes:
 *                       type: integer
 *                     recent_retweets:
 *                       type: integer
 *                     engagement_rate_percent:
 *                       type: number
 *                       format: float
 *                     comments:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           post_id:
 *                             type: string
 *                           user_id:
 *                             type: string
 *                           username:
 *                             type: string
 *                           content:
 *                             type: string
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                           updated_at:
 *                             type: string
 *                             format: date-time
 */
router.get(
  "/:postId/analytics",
  authMiddleware,
  validateSchemaMiddleware({ params: postsSchema.postAnalyticsParamsSchema }),
  postsController.getPostAnalytics
);

/**
 * @swagger
 * /posts/{postId}/comments:
 *   post:
 *     summary: Add a comment to a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Comment added
 */
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

/**
 * @swagger
 * /posts/{postId}/comments:
 *   get:
 *     summary: Get comments for a post
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of comments
 */
// Get comments for a post
router.get("/:postId/comments", postsController.getComments);

/**
 * @swagger
 * /posts/{postId}:
 *   delete:
 *     summary: Delete a post and all related data (likes, retweets, comments, images)
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the post to delete
 *     responses:
 *       200:
 *         description: Post and related data deleted successfully
 *       404:
 *         description: Post not found
 *       500:
 *         description: Failed to delete post
 */
router.delete("/:postId", authMiddleware, postsController.deletePost);

module.exports = router;
