const Post = require("../models/PostgreSQLPost");
const { uploadToS3 } = require("../utils/s3");
const {
  UserLike,
  UserRetweet,
  UserFollow,
} = require("../models/PostgreSQLModels");
const { sequelize } = require("../config/postgresql");

// Post controller using PostgreSQL for complex queries and analytics
const postsController = {
  // Create a new post
  createPost: async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
      const file = req.file;
      console.log("File received:", file);
      const { content, location } = req.body;

      const hashtags =
        content?.match(/#\w+/g)?.map((tag) => tag.substring(1)) || [];
      const mentions =
        content?.match(/@\w+/g)?.map((mention) => mention.substring(1)) || [];

      const mediaUrls = [];

      if (file) {
        console.log("➡️ Uploading file:", file.originalname);
        const url = await uploadToS3(
          file.buffer,
          file.originalname,
          file.mimetype
        );
        console.log("📎 URL returned:", url);
        mediaUrls.push(url);
      }

      console.log("Media URLs:", mediaUrls);

      if ((!content || content.trim() === "") && mediaUrls.length === 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: "Post content or media is required",
        });
      }

      const post = await Post.create(
        {
          user_id: req.user._id.toString(),
          username: req.user.username,
          content: content?.trim(),
          media_urls: mediaUrls,
          hashtags,
          mentions,
          location,
        },
        { transaction }
      );

      await transaction.commit();

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
        },
      });
    } catch (error) {
      await transaction.rollback();
      console.error("Create post error:", error);
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
      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;

      const feedPosts = await Post.findUserFeed(userId, limit, offset);

      res.json({
        success: true,
        message: "Feed retrieved successfully",
        posts: feedPosts,
        pagination: {
          limit,
          offset,
          hasMore: feedPosts.length === limit,
        },
      });
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

      // Check if already liked
      const existingLike = await UserLike.findOne({
        where: { user_id: userId, post_id: postId },
        transaction,
      });

      if (existingLike) {
        return res.status(400).json({
          success: false,
          error: "Post already liked",
        });
      }

      // Create like record
      await UserLike.create(
        {
          user_id: userId,
          post_id: postId,
          username: req.user.username,
        },
        { transaction }
      );

      // Update post like count
      await sequelize.query(
        "UPDATE posts SET like_count = like_count + 1 WHERE id = :postId",
        {
          replacements: { postId },
          type: sequelize.QueryTypes.UPDATE,
          transaction,
        }
      );

      await transaction.commit();

      res.json({
        success: true,
        message: "Post liked successfully",
      });
    } catch (error) {
      await transaction.rollback();
      console.error("Like post error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to like post",
        message: error.message,
      });
    }
  },

  // Get post analytics using complex SQL aggregations
  getPostAnalytics: async (req, res) => {
    try {
      const { postId } = req.params;

      // Complex query to get comprehensive post analytics
      const [analytics] = await sequelize.query(
        `
        SELECT 
          p.id,
          p.content,
          p.created_at,
          p.like_count,
          p.retweet_count,
          p.comment_count,
          
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
        GROUP BY p.id, p.content, p.created_at, p.like_count, p.retweet_count, p.comment_count, p.user_id
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

      res.json({
        success: true,
        message: "Post analytics retrieved successfully",
        analytics,
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

      // Check if post exists
      const post = await Post.findByPk(postId);
      if (!post) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          error: "Post not found",
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

        // Decrement retweet count
        await post.update(
          { retweet_count: Math.max(0, post.retweet_count - 1) },
          { transaction }
        );

        await transaction.commit();

        return res.json({
          success: true,
          message: "Post unretweeted successfully",
          retweetCount: Math.max(0, post.retweet_count - 1),
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

        // Increment retweet count
        await post.update(
          { retweet_count: post.retweet_count + 1 },
          { transaction }
        );

        await transaction.commit();

        return res.json({
          success: true,
          message: "Post retweeted successfully",
          retweetCount: post.retweet_count + 1,
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
