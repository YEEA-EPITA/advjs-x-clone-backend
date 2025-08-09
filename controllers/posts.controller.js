const Post = require("../models/PostgreSQLPost");
const { uploadToS3 } = require("../utils/s3");
const { getIO } = require("../utils/socket");
const { Poll, PollOption, UserLike, UserRetweet } = require("../models");
const Comment = require("../models/Comment");
const { sequelize } = require("../config/postgresql");
const { ResponseFactory, ErrorFactory } = require("../factories");
const NotificationService = require("./NotificationService");

// Post controller using PostgreSQL for complex queries and analytics
const postsController = {
  // Soft delete a post (mark as deleted, do not remove data or S3 images)
  deletePost: async (req, res) => {
    try {
      const { postId } = req.params;
      const userId = req.user._id.toString();
      // Find the post
      const post = await Post.findByPk(postId);
      if (!post) {
        return ErrorFactory.internalServerError({
          res,
          message: "Post not found",
        });
      }
      if (post.user_id !== userId) {
        return ErrorFactory.internalServerError({
          res,
          message: "Unauthorized: You can only delete your own posts",
        });
      }

      // Soft delete: set is_deleted and deleted_at
      post.is_deleted = true;
      post.deleted_at = new Date();
      await post.save();

      // Emit socket event to notify clients
      getIO().emit("postDeleted", {
        postId: post.id,
        userId,
      });

      return ResponseFactory.success({
        res,
        message: "Post deleted successfully",
      });
    } catch (error) {
      console.error("Delete post error:", error);
      return ErrorFactory.internalServerError({
        res,
        message: "Failed to delete post",
        error: error.message,
      });
    }
  },
  // Get all public posts as live feeds with cursor-based pagination
  getLiveFeeds: async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const cursor = req.query.cursor || null;

      // Fetch live feeds from model
      const userId = req.user?._id?.toString() || null;
      const { feeds, nextCursor, hasMore } = await Post.findLiveFeeds(
        userId,
        limit,
        cursor
      );

      return ResponseFactory.success({
        res,
        message: "Live feeds retrieved successfully",
        data: {
          feeds,
          pagination: {
            limit,
            nextCursor,
            hasMore,
          },
        },
      });
    } catch (error) {
      console.error("Get live feeds error:", error);
      return ErrorFactory.internalServerError({
        res,
        message: "Failed to retrieve live feeds",
        error: error.message,
      });
    }
  },

  // Add a comment to a post
  addComment: async (req, res) => {
    const Comment = require("../models/Comment");
    const { postId } = req.params;
    const { content } = req.body;
    if (!content || content.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "Comment content is required",
      });
    }
    try {
      // Block if post is soft deleted
      const post = await Post.findByPk(postId);
      if (!post || post.is_deleted) {
        return res.status(404).json({
          success: false,
          error: "Post not found or has been deleted",
        });
      }
      const comment = await Comment.create({
        post_id: postId,
        user_id: req.user._id.toString(),
        username: req.user.username,
        content: content.trim(),
      });
      // Optionally increment comment_count in posts table
      await Post.increment("comment_count", { where: { id: postId } });

      // Create comment notification for post owner using NotificationService
      await NotificationService.createCommentNotification({
        post,
        actor: req.user,
      });

      res.status(201).json({
        success: true,
        message: "Comment added successfully",
        comment,
      });
    } catch (error) {
      console.error("Add comment error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to add comment",
        message: error.message,
      });
    }
  },

  // Get poll for a post
  getPollByPost: async (req, res) => {
    const { postId } = req.params;
    try {
      // Find poll by postId
      const poll = await Poll.findOne({ where: { post_id: postId } });
      if (!poll) {
        return res
          .status(404)
          .json({ success: false, error: "No poll found for this post" });
      }
      // Find poll options
      const options = await PollOption.findAll({ where: { poll_id: poll.id } });
      res.json({
        success: true,
        poll,
        options,
      });
    } catch (error) {
      console.error("Get poll by post error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get poll",
        message: error.message,
      });
    }
  },
  // Get comments for a post
  getComments: async (req, res) => {
    const Comment = require("../models/Comment");
    const { postId } = req.params;
    try {
      // Check if post is soft deleted
      const post = await Post.findByPk(postId);
      if (!post || post.is_deleted) {
        return res.status(404).json({
          success: false,
          error: "Post not found or has been deleted",
        });
      }
      const comments = await Comment.findAll({
        where: { post_id: postId },
        order: [["created_at", "DESC"]],
      });
      res.json({
        success: true,
        comments,
      });
    } catch (error) {
      console.error("Get comments error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get comments",
        message: error.message,
      });
    }
  },
  // Create a new post
  createPost: async (req, res) => {
    const user = req.user;
    const { content, location } = req.body;

    // 1) Parse poll safely
    let pollPayload = null;
    if (req.body.poll) {
      try {
        pollPayload =
          typeof req.body.poll === "string"
            ? JSON.parse(req.body.poll)
            : req.body.poll;
      } catch (e) {
        return res
          .status(400)
          .json({ success: false, error: "Poll must be valid JSON" });
      }
    }

    // Quick validation helper
    const isValidPoll =
      pollPayload &&
      typeof pollPayload.question === "string" &&
      pollPayload.question.trim().length > 0 &&
      Array.isArray(pollPayload.options) &&
      pollPayload.options.length >= 2;

    // 2) Extract tags
    const hashtags = content?.match(/#\w+/g)?.map((t) => t.slice(1)) || [];
    const mentions = content?.match(/@\w+/g)?.map((m) => m.slice(1)) || [];

    // 3) Upload media (outside tx)
    const media_urls = [];
    try {
      if (req.file) {
        const url = await uploadToS3(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype
        );
        media_urls.push(url);
      }
    } catch (e) {
      return res.status(500).json({
        success: false,
        error: "Media upload failed",
        message: e.message,
      });
    }

    if ((!content || !content.trim()) && media_urls.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "Post content or media is required" });
    }

    if (mentions.length) {
      NotificationService.createMentionNotifications({
        mentionedUsernames: mentions,
        actor: user,
      }).catch((err) => console.warn("Mention notify failed:", err.message));
    }

    // 4) DB writes (managed transaction)
    let post,
      pollId = null,
      pollMeta = null;

    try {
      ({ post, pollId, pollMeta } = await sequelize.transaction(async (t) => {
        const newPost = await Post.create(
          {
            user_id: user._id.toString(),
            username: user.username,
            content: content?.trim() || null,
            media_urls,
            hashtags,
            mentions,
            location,
            like_count: 0,
            retweet_count: 0,
            comment_count: 0,
            is_public: true,
          },
          { transaction: t }
        );

        let createdPollId = null;
        let createdPollMeta = null;

        if (isValidPoll) {
          const p = await Poll.create(
            {
              post_id: newPost.id,
              user_id: user._id.toString(),
              question: pollPayload.question.trim(),
              expires_at: pollPayload.expires_at || null,
            },
            { transaction: t }
          );

          const rows = pollPayload.options.map((text) => ({
            poll_id: p.id,
            option_text: String(text),
          }));
          await PollOption.bulkCreate(rows, { transaction: t });

          createdPollId = p.id;
          createdPollMeta = {
            question: p.question,
            expires_at: p.expires_at || null,
          };
        }

        return {
          post: newPost,
          pollId: createdPollId,
          pollMeta: createdPollMeta,
        };
      }));
    } catch (e) {
      return res.status(500).json({
        success: false,
        error: "Failed to create post",
        message: e.message,
      });
    }

    // 5) Post-commit: build poll (use safe order by id)
    let poll = null;
    if (pollId) {
      try {
        const options = await PollOption.findAll({
          where: { poll_id: pollId },
          attributes: ["id", "option_text"],
          order: [["id", "ASC"]], // <-- safer than created_at
        });
        poll = {
          id: pollId,
          question: pollMeta.question,
          expires_at: pollMeta.expires_at,
          options: options.map((o) => ({
            id: o.id,
            option_text: o.option_text,
            vote_count: 0,
          })),
          voted: false,
          selected_option_id: null,
        };
      } catch (e) {
        console.warn("Poll options fetch failed:", e.message);
        // leave poll = null
      }
    } else {
      // Optional debug to confirm validation path
      console.warn(
        "No poll created. Received pollPayload:",
        JSON.stringify(pollPayload)
      );
    }

    const responsePost = {
      id: post.id,
      user_id: post.user_id,
      username: post.username,
      content: post.content,
      content_type: post.media_urls?.length ? "media" : "text",
      media_urls: post.media_urls || [],
      hashtags: post.hashtags || [],
      mentions: post.mentions || [],
      like_count: post.like_count ?? 0,
      retweet_count: post.retweet_count ?? 0,
      comment_count: post.comment_count ?? 0,
      is_public: post.is_public ?? true,
      location: post.location || "Unknown",
      created_at: post.created_at,
      updated_at: post.updated_at || post.created_at,
      is_deleted: !!post.is_deleted,
      deleted_at: post.deleted_at || null,
      liked_by_me: false,
      poll,
    };

    try {
      getIO().emit("new_feed", responsePost);
    } catch {
      /* ignore */
    }

    return res.status(201).json({
      success: true,
      message: "Post created successfully",
      post: responsePost,
    });
  },

  // Get user's personalized feed using complex SQL queries
  getUserFeed: async (req, res) => {
    try {
      const userId = req.user._id.toString();
      // Fetch all posts for the user
      const feedPosts = await Post.findUserFeed(userId);
      res.json(feedPosts);
    } catch (error) {
      console.error("Get user feed error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve feed",
        message: error.message,
      });
    }
  },

  // Search posts with complex filtering
  searchPosts: async (req, res) => {
    try {
      const {
        q: searchTerm,
        type: contentType,
        from: fromDate,
        limit = 50,
      } = req.query;

      const filters = {
        contentType,
        fromDate: fromDate ? new Date(fromDate) : null,
        limit: Math.min(parseInt(limit), 100), // Cap at 100
      };

      const posts = await Post.searchPosts(searchTerm, filters);

      res.json({
        success: true,
        message: "Search completed successfully",
        results: posts,
        searchTerm,
        filters: {
          contentType: filters.contentType || "all",
          fromDate: filters.fromDate,
          resultsCount: posts.length,
        },
      });
    } catch (error) {
      console.error("Search posts error:", error);
      res.status(500).json({
        success: false,
        error: "Search failed",
        message: error.message,
      });
    }
  },

  // Get trending hashtags using SQL aggregation
  getTrendingHashtags: async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 10, 50);
      const timeframe = Math.min(parseInt(req.query.hours) || 24, 168); // Max 7 days

      const trends = await Post.findTrendingHashtags(limit, timeframe);

      res.json({
        success: true,
        message: "Trending hashtags retrieved successfully",
        trends: trends.map((trend) => ({
          hashtag: `#${trend.hashtag}`,
          usageCount: parseInt(trend.usage_count),
          uniqueUsers: parseInt(trend.unique_users),
        })),
        timeframe: `${timeframe} hours`,
      });
    } catch (error) {
      console.error("Get trending hashtags error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get trending hashtags",
        message: error.message,
      });
    }
  },

  // Like a post with SQL transaction
  likePost: async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
      const { postId } = req.params;
      const userId = req.user._id.toString();

      // Check post validity
      const post = await Post.findByPk(postId);
      if (!post || post.is_deleted) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          error: "Post not found or has been deleted",
        });
      }

      // Check if already liked
      const existingLike = await UserLike.findOne({
        where: { user_id: userId, post_id: postId },
        transaction,
      });

      let action = "";
      if (existingLike) {
        // Unlike
        await UserLike.destroy({
          where: { user_id: userId, post_id: postId },
          transaction,
        });

        await sequelize.query(
          "UPDATE posts SET like_count = like_count - 1 WHERE id = :postId AND like_count > 0",
          {
            replacements: { postId },
            type: sequelize.QueryTypes.UPDATE,
            transaction,
          }
        );

        action = "unlike";
      } else {
        // Like
        await UserLike.create(
          {
            user_id: userId,
            post_id: postId,
            username: req.user.username,
          },
          { transaction }
        );

        await sequelize.query(
          "UPDATE posts SET like_count = like_count + 1 WHERE id = :postId",
          {
            replacements: { postId },
            type: sequelize.QueryTypes.UPDATE,
            transaction,
          }
        );

        action = "like";
      }

      await transaction.commit();

      // Get updated like count
      const updatedPost = await Post.findByPk(postId);

      // Emit socket event for all clients
      getIO().emit("likeUpdated", {
        post_id: postId,
        action,
        like_count: updatedPost.like_count,
        userId,
      });

      // Send notification if it's a like
      if (action === "like") {
        await NotificationService.createLikeNotification({
          post,
          actor: req.user,
        });
      }

      // Final response
      return ResponseFactory.success({
        res,
        message:
          action === "like"
            ? "Post liked successfully"
            : "Post unliked successfully",
        data: {
          post_id: postId,
          userId,
          isLiked: action === "like",
          likeCount: updatedPost.like_count,
        },
      });
    } catch (error) {
      await transaction.rollback();
      return ErrorFactory.internalServerError({
        res,
        message: "Failed to like/unlike post",
        error: error.message,
      });
    }
  },

  // Get post analytics using complex SQL aggregations
  getPostAnalytics: async (req, res) => {
    try {
      const { postId } = req.params;

      // Block if post is soft deleted
      const post = await Post.findByPk(postId);
      if (!post || post.is_deleted) {
        return res.status(404).json({
          success: false,
          error: "Post not found or has been deleted",
        });
      }

      // Complex query to get comprehensive post analytics
      const [analytics] = await sequelize.query(
        `
        SELECT 
          p.id,
          p.content,
          p.user_id,
          p.username,
          p.created_at,
          p.like_count,
          p.retweet_count,
          p.comment_count,
          p.media_urls,
          -- Engagement metrics
          (p.like_count + p.retweet_count + p.comment_count) as total_engagement,
          -- Time-based analytics
          COUNT(DISTINCT ul.user_id) as unique_likers,
          COUNT(DISTINCT ur.user_id) as unique_retweeters,
          -- Recent engagement (last 24 hours)
          COUNT(DISTINCT CASE WHEN ul.liked_at >= NOW() - INTERVAL '24 hours' THEN ul.user_id END) as recent_likes,
          COUNT(DISTINCT CASE WHEN ur.retweeted_at >= NOW() - INTERVAL '24 hours' THEN ur.user_id END) as recent_retweets,
          -- Engagement rate calculation
          ROUND(
            ((p.like_count + p.retweet_count + p.comment_count) * 100.0) / 
            GREATEST((
              SELECT COUNT(*) FROM user_follows 
              WHERE following_id = p.user_id
            ), 1), 2
          ) as engagement_rate_percent
        FROM posts p
        LEFT JOIN user_likes ul ON p.id = ul.post_id
        LEFT JOIN user_retweets ur ON p.id = ur.post_id
        WHERE p.id = :postId
        GROUP BY p.id, p.content, p.user_id, p.username, p.created_at, p.like_count, p.retweet_count, p.comment_count, p.media_urls
      `,
        {
          replacements: { postId },
          type: sequelize.QueryTypes.SELECT,
        }
      );

      if (!analytics) {
        return res.status(404).json({
          success: false,
          error: "Post not found",
        });
      }

      // Get displayName from MongoDB User collection
      const User = require("../models/UserModels");
      let displayName = null;
      if (analytics.user_id) {
        const userDoc = await User.findById(analytics.user_id).select(
          "displayName"
        );
        displayName = userDoc ? userDoc.displayName : null;
      }

      // Get comments for the post
      const Comment = require("../models/Comment");
      const comments = await Comment.findAll({
        where: { post_id: postId },
        order: [["created_at", "DESC"]],
      });

      // Reorder analytics fields for response
      const orderedAnalytics = {
        id: analytics.id,
        content: analytics.content,
        user_id: analytics.user_id,
        username: analytics.username,
        displayName,
        created_at: analytics.created_at,
        like_count: analytics.like_count,
        retweet_count: analytics.retweet_count,
        comment_count: analytics.comment_count,
        media_urls: analytics.media_urls,
        total_engagement: analytics.total_engagement,
        unique_likers: analytics.unique_likers,
        unique_retweeters: analytics.unique_retweeters,
        recent_likes: analytics.recent_likes,
        recent_retweets: analytics.recent_retweets,
        engagement_rate_percent: analytics.engagement_rate_percent,
        comments,
      };
      res.json({
        success: true,
        message: "Post analytics retrieved successfully",
        analytics: orderedAnalytics,
      });
    } catch (error) {
      console.error("Get post analytics error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get post analytics",
        message: error.message,
      });
    }
  },

  // Retweet a post
  retweetPost: async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
      const { postId } = req.params;
      const { comment = "" } = req.body;
      const userId = req.user._id.toString();
      const username = req.user.username;

      // Block if post is soft deleted
      const post = await Post.findByPk(postId);
      if (!post || post.is_deleted) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          error: "Post not found or has been deleted",
        });
      }

      // Check if user already retweeted this post
      const existingRetweet = await UserRetweet.findOne({
        where: {
          user_id: userId,
          post_id: postId,
        },
        transaction,
      });

      if (existingRetweet) {
        // Remove retweet (unretweet)
        await existingRetweet.destroy({ transaction });

        // Recalculate retweet count
        const newCount = await UserRetweet.count({
          where: { post_id: postId },
          transaction,
        });
        await post.update({ retweet_count: newCount }, { transaction });
        // Decrement retweet count atomically
        await sequelize.query(
          "UPDATE posts SET retweet_count = GREATEST(retweet_count - 1, 0) WHERE id = :postId",
          {
            replacements: { postId },
            type: sequelize.QueryTypes.UPDATE,
            transaction,
          }
        );

        await transaction.commit();

        // Fetch updated count
        const updatedPost = await Post.findByPk(postId);
        return res.json({
          success: true,
          message: "Post unretweeted successfully",
          retweetCount: newCount,
          isRetweeted: false,
        });
      } else {
        // Create new retweet
        await UserRetweet.create(
          {
            user_id: userId,
            post_id: postId,
            username,
            comment,
          },
          { transaction }
        );

        // Recalculate retweet count
        const newCount = await UserRetweet.count({
          where: { post_id: postId },
          transaction,
        });
        await post.update({ retweet_count: newCount }, { transaction });
        // Increment retweet count atomically
        await sequelize.query(
          "UPDATE posts SET retweet_count = retweet_count + 1 WHERE id = :postId",
          {
            replacements: { postId },
            type: sequelize.QueryTypes.UPDATE,
            transaction,
          }
        );

        // Create retweet notification for post owner using NotificationService
        await NotificationService.createRetweetNotification({
          post,
          actor: req.user,
        });

        await transaction.commit();

        // Fetch updated count
        const updatedPost = await Post.findByPk(postId);
        return res.json({
          success: true,
          message: "Post retweeted successfully",
          retweetCount: newCount,
          isRetweeted: true,
        });
      }
    } catch (error) {
      await transaction.rollback();
      console.error("Retweet post error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retweet post",
        message: error.message,
      });
    }
  },
};

module.exports = postsController;
