const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/postgresql");
const { PollOption } = require("./PollsModels");
const { UserRetweet } = require("./PostgreSQLModels");

// Post model for PostgreSQL - handles structured data and complex queries
const Post = sequelize.define(
  "Post",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "References MongoDB User._id",
      index: true,
    },
    username: {
      type: DataTypes.STRING(30),
      allowNull: false,
      index: true,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 2000],
      },
    },
    content_type: {
      type: DataTypes.ENUM("text", "image", "video", "link"),
      defaultValue: "text",
    },
    media_urls: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      defaultValue: [],
    },
    hashtags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      comment: "Extracted hashtags for efficient searching",
    },
    mentions: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      comment: "User mentions for notifications",
    },
    like_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    retweet_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    comment_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    is_public: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    location: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    is_deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: "Soft delete flag",
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Soft delete timestamp",
    },
  },
  {
    tableName: "posts",
    indexes: [
      {
        fields: ["user_id"],
      },
      {
        fields: ["created_at"],
      },
      // Temporarily disable GIN indexes to resolve constraint error
      // {
      //   fields: ["hashtags"],
      //   using: "gin", // PostgreSQL GIN index for array searches
      // },
      // {
      //   fields: ["content"],
      //   using: "gin", // Full-text search index
      // },
    ],
  }
);

// Class methods for complex queries
Post.findTrendingHashtags = async (limit = 10, timeframe = 24) => {
  const query = `
    SELECT 
      unnest(hashtags) as hashtag,
      COUNT(*) as usage_count,
      COUNT(DISTINCT user_id) as unique_users
    FROM posts 
    WHERE created_at >= NOW() - INTERVAL '${timeframe} hours'
      AND array_length(hashtags, 1) > 0
    GROUP BY hashtag
    ORDER BY usage_count DESC, unique_users DESC
    LIMIT ${limit}
  `;

  const [results] = await sequelize.query(query);
  return Array.isArray(results) ? results : results != null ? [results] : [];
};

Post.findUserFeed = async (userId, limit = 20, offset = 0) => {
  const query = `
    WITH user_network AS (
      SELECT DISTINCT following_id as user_id 
      FROM user_follows 
      WHERE follower_id = :userId
      UNION
      SELECT :userId as user_id
    )
    SELECT 
      p.*,
      COALESCE(ul.liked_at IS NOT NULL, false) as user_liked,
      COALESCE(ur.retweeted_at IS NOT NULL, false) as user_retweeted
    FROM posts p
    INNER JOIN user_network un ON p.user_id = un.user_id
    LEFT JOIN user_likes ul ON p.id = ul.post_id AND ul.user_id = :userId
    LEFT JOIN user_retweets ur ON p.id = ur.post_id AND ur.user_id = :userId
    WHERE p.is_public = true AND p.is_deleted = false
    ORDER BY p.created_at DESC
    LIMIT :limit OFFSET :offset
  `;

  const replacements = { userId, limit, offset };
  const results = await sequelize.query(query, {
    replacements,
    type: sequelize.QueryTypes.SELECT,
  });
  return Array.isArray(results) ? results : results != null ? [results] : [];
};

Post.searchPosts = async (searchTerm, filters = {}) => {
  let whereClause = "p.is_public = true AND p.is_deleted = false";
  let replacements = {};

  if (searchTerm) {
    whereClause += ` AND (
      p.content ILIKE :searchTerm 
      OR p.username ILIKE :searchUser
    )`;
    replacements.searchTerm = `%${searchTerm}%`;
    replacements.searchUser = `%${searchTerm}%`;
  }

  if (filters.contentType) {
    whereClause += " AND p.content_type = :contentType";
    replacements.contentType = filters.contentType;
  }

  if (filters.fromDate) {
    whereClause += " AND p.created_at >= :fromDate";
    replacements.fromDate = filters.fromDate;
  }

  const query = `
    SELECT 
      p.*,
      p.like_count + p.retweet_count + p.comment_count as engagement_score
    FROM posts p
    WHERE ${whereClause}
    ORDER BY engagement_score DESC, p.created_at DESC
    LIMIT ${filters.limit || 50}
  `;

  const results = await sequelize.query(query, {
    replacements,
    type: sequelize.QueryTypes.SELECT,
  });

  return results;
};

// Offset-based pagination for live feeds
Post.findLiveFeeds = async (userId, limit = 20, cursor = null) => {
  let whereClause = "p.is_public = true AND p.is_deleted = false";
  const replacements = { userId };

  if (cursor) {
    const [createdAt, id] = cursor.split("|");
    whereClause +=
      " AND (p.created_at < :createdAt OR (p.created_at = :createdAt AND p.id < :id))";
    replacements.createdAt = createdAt;
    replacements.id = id;
  }

  const query = `
    SELECT 
      p.*,
      poll.id AS poll_id,
      poll.question AS poll_question,
      poll.expires_at AS poll_expires_at,
      pv.option_id AS selected_option_id,
      pl.id IS NOT NULL AS liked_by_me
    FROM posts p
    LEFT JOIN polls poll ON poll.post_id = p.id
    LEFT JOIN poll_votes pv ON poll.id = pv.poll_id AND pv.user_id = :userId
    LEFT JOIN user_likes pl ON pl.post_id = p.id AND pl.user_id = :userId
    WHERE ${whereClause}
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT :limit
  `;
  replacements.limit = limit;

  const results = await sequelize.query(query, {
    replacements,
    type: sequelize.QueryTypes.SELECT,
  });

  // Step 1: Extract poll_ids for batch-fetching options
  const pollIds = results.filter((r) => r.poll_id).map((r) => r.poll_id);

  let optionsMap = {};
  if (pollIds.length > 0) {
    const options = await PollOption.findAll({
      where: { poll_id: pollIds },
      attributes: ["id", "poll_id", "option_text", "vote_count"],
      raw: true,
    });

    // Group options by poll_id
    optionsMap = options.reduce((acc, opt) => {
      if (!acc[opt.poll_id]) acc[opt.poll_id] = [];
      acc[opt.poll_id].push({
        id: opt.id,
        option_text: opt.option_text,
        vote_count: opt.vote_count,
      });
      return acc;
    }, {});
  }

  const feeds = results.map((post) => {
    const formattedPost = {
      ...post,
    };

    // attach poll if exists
    if (post.poll_id) {
      formattedPost.poll = {
        id: post.poll_id,
        question: post.poll_question,
        expires_at: post.poll_expires_at,
        options: optionsMap[post.poll_id] || [],
        voted: !!post.selected_option_id,
        selected_option_id: post.selected_option_id || null,
      };
    }

    // Cleanup
    delete formattedPost.poll_id;
    delete formattedPost.poll_question;
    delete formattedPost.poll_expires_at;
    delete formattedPost.selected_option_id;

    return formattedPost;
  });

  let nextCursor = null;
  let hasMore = false;
  if (feeds.length === limit) {
    const last = feeds[feeds.length - 1];
    nextCursor = `${last.created_at.toISOString()}|${last.id}`;
    hasMore = true;
  }

  return {
    feeds,
    nextCursor,
    hasMore,
  };
};

module.exports = Post;
