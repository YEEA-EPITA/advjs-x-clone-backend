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
  // Complex query joining user relationships and posts
  const query = `
    WITH user_network AS (
      SELECT DISTINCT following_id as user_id 
      FROM user_follows 
      WHERE follower_id = :userId
      UNION
      SELECT :userId as user_id -- Include own posts
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

// Cursor-based pagination for live feeds
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

  // Fetch posts
  const postQuery = `
    SELECT p.* FROM posts p
    WHERE ${whereClause}
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT :limit
  `;
  replacements.limit = limit;
  const posts = await sequelize.query(postQuery, {
    replacements,
    type: sequelize.QueryTypes.SELECT,
  });

  // Fetch retweets for these posts
  let retweets = [];
  if (posts.length > 0) {
    const postIds = posts.map((post) => post.id);
    retweets = await UserRetweet.findAll({
      where: { post_id: postIds },
      raw: true,
    });
  }

  // Build retweet feed items
  const retweetFeedItems = retweets.map((rt) => {
    // Find the original post for this retweet
    const originalPost = posts.find((p) => p.id === rt.post_id);
    return {
      type: "retweet",
      retweetId: rt.id,
      retweeterId: rt.user_id,
      retweeterUsername: rt.username,
      retweetComment: rt.comment,
      retweetedAt: rt.retweeted_at,
      originalPost,
    };
  });

  // Build normal post feed items
  const postFeedItems = posts.map((post) => ({
    type: "post",
    ...post,
  }));

  // Combine and sort by createdAt/retweetedAt descending
  const combinedFeed = [...postFeedItems, ...retweetFeedItems].sort((a, b) => {
    const aTime =
      a.type === "retweet" ? new Date(a.retweetedAt) : new Date(a.created_at);
    const bTime =
      b.type === "retweet" ? new Date(b.retweetedAt) : new Date(b.created_at);
    return bTime - aTime;
  });

  // Pagination logic (cursor for combined feed)
  let nextCursor = null;
  let hasMore = false;
  if (combinedFeed.length === limit) {
    const last = combinedFeed[combinedFeed.length - 1];
    const lastTime =
      last.type === "retweet" ? last.retweetedAt : last.created_at;
    nextCursor = `${new Date(lastTime).toISOString()}|${
      last.type === "retweet" ? last.retweetId : last.id
    }`;
    hasMore = true;
  }

  return {
    feeds: combinedFeed.slice(0, limit),
    nextCursor,
    hasMore,
  };
};

module.exports = Post;
