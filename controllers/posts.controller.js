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
      let page = Number(req.query.page);
      page = Number.isInteger(page) && page > 0 ? page : 1;
      let limit = Number(req.query.limit);
      limit = Number.isInteger(limit) && limit > 0 && limit <= 100 ? limit : 20;

      // Fetch live feeds from model
      const userId = req.user?._id?.toString() || null;
      const {
        feeds,
        page: returnedPage,
        limit: returnedLimit,
        totalCount,
      } = await Post.findLiveFeeds(userId, limit, page);

      return ResponseFactory.success({
        res,
        message: "Live feeds retrieved successfully",
        data: {
          feeds,
          pagination: {
            page: returnedPage,
            limit: returnedLimit,
            totalCount,
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
    const transaction = await sequelize.transaction();

    try {
      const file = req.file;
      const jwtUser = req.user;
      const { content, location } = req.body;
      let poll = null;

      if (req.body.poll) {
        try {
          poll = JSON.parse(req.body.poll);
        } catch (err) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            error: "Poll must be a valid JSON object",
          });
        }
      }

      const hashtags =
        content?.match(/#\w+/g)?.map((tag) => tag.substring(1)) || [];
      const mentions =
        content?.match(/@\w+/g)?.map((mention) => mention.substring(1)) || [];

      // Create mention notifications for each mentioned user using NotificationService
      await NotificationService.createMentionNotifications({
        mentionedUsernames: mentions,
        actor: jwtUser,
      });

      const mediaUrls = [];

      if (file) {
        const url = await uploadToS3(
          file.buffer,
          file.originalname,
          file.mimetype
        );
        mediaUrls.push(url);
      }

      if ((!content || content.trim() === "") && mediaUrls.length === 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: "Post content or media is required",
        });
      }

      const post = await Post.create(
        {
          user_id: jwtUser._id.toString(),
          username: jwtUser.username,
          content: content?.trim(),
          media_urls: mediaUrls,
          hashtags,
          mentions,
          location,
        },
        { transaction }
      );

      let createdPoll = null;
      if (
        poll &&
        poll.question &&
        Array.isArray(poll.options) &&
        poll.options.length >= 2
      ) {
        createdPoll = await Poll.create(
          {
            post_id: post.id,
            user_id: jwtUser._id.toString(),
            question: poll.question,
            expires_at: poll.expires_at || null,
          },
          { transaction }
        );

        const pollOptions = poll.options.map((text) => ({
          poll_id: createdPoll.id,
          option_text: text,
        }));

        await PollOption.bulkCreate(pollOptions, { transaction });
      }

      await transaction.commit();

      let pollData = null;
      if (createdPoll) {
        const pollOptions = await PollOption.findAll({
          where: { poll_id: createdPoll.id },
          attributes: ["id", "option_text"],
        });

        pollData = {
          id: createdPoll.id,
          question: createdPoll.question,
          expires_at: createdPoll.expires_at,
          options: pollOptions,
        };
      }

      getIO().emit("new_feed", {
        id: post.id,
        content: post.content,
        username: post.username,
        createdAt: post.created_at,
        mediaUrls: post.media_urls,
        poll: createdPoll
          ? {
              id: createdPoll.id,
              question: createdPoll.question,
              options: poll.options,
            }
          : null,
      });

      res.status(201).json({
        success: true,
        message: "Post created successfully",
        post: {
          id: post.id,
          content: post.content,
          hashtags: post.hashtags,
          mentions: post.mentions,
          mediaUrls: post.media_urls,
          location: post.location,
          createdAt: post.created_at,
          poll: pollData,
        },
      });
    } catch (error) {
      await transaction.rollback();
      res.status(500).json({
        success: false,
        error: "Failed to create post",
        message: error.message,
      });
    }
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
