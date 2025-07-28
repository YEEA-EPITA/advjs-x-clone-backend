const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/postgresql");

// User Follows model for complex relationship queries
const UserFollow = sequelize.define(
  "UserFollow",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    follower_id: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "References MongoDB User._id",
    },
    following_id: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "References MongoDB User._id",
    },
    follower_username: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    following_username: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
  },
  {
    tableName: "user_follows",
    indexes: [
      {
        fields: ["follower_id"],
      },
      {
        fields: ["following_id"],
      },
      {
        unique: true,
        fields: ["follower_id", "following_id"],
      },
    ],
  }
);

// User Likes model for engagement tracking
const UserLike = sequelize.define(
  "UserLike",
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
    },
    post_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: "References PostgreSQL Post.id",
    },
    username: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    liked_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
  },
  {
    tableName: "user_likes",
    indexes: [
      {
        fields: ["user_id"],
      },
      {
        fields: ["post_id"],
      },
      {
        unique: true,
        fields: ["user_id", "post_id"],
      },
      {
        fields: ["liked_at"],
      },
    ],
  }
);

// User Retweets model
const UserRetweet = sequelize.define(
  "UserRetweet",
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
    },
    post_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: "References PostgreSQL Post.id",
    },
    username: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    retweeted_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
  },
  {
    tableName: "user_retweets",
    indexes: [
      {
        fields: ["user_id"],
      },
      {
        fields: ["post_id"],
      },
      {
        unique: true,
        fields: ["user_id", "post_id"],
      },
      {
        fields: ["retweeted_at"],
      },
    ],
  }
);

// Analytics model for tracking trends and metrics
const Analytics = sequelize.define(
  "Analytics",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    metric_type: {
      type: DataTypes.ENUM(
        "daily_posts",
        "daily_users",
        "hashtag_trends",
        "engagement_stats"
      ),
      allowNull: false,
    },
    metric_key: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "For hashtags or specific metrics",
    },
    metric_value: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    additional_data: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: "Extra metadata for the metric",
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
  },
  {
    tableName: "analytics",
    indexes: [
      {
        fields: ["date"],
      },
      {
        fields: ["metric_type"],
      },
      {
        fields: ["metric_key"],
      },
      {
        unique: true,
        fields: ["date", "metric_type", "metric_key"],
      },
    ],
  }
);

// Complex query methods
UserFollow.getMutualFollowers = async (userId1, userId2) => {
  const query = `
    SELECT f1.following_id as mutual_user_id, f1.following_username
    FROM user_follows f1
    INNER JOIN user_follows f2 ON f1.following_id = f2.following_id
    WHERE f1.follower_id = :userId1 AND f2.follower_id = :userId2
      AND f1.following_id NOT IN (:userId1, :userId2)
    ORDER BY f1.following_username
  `;

  const [results] = await sequelize.query(query, {
    replacements: { userId1, userId2 },
    type: sequelize.QueryTypes.SELECT,
  });

  return results;
};

UserFollow.getFollowerGrowth = async (userId, days = 30) => {
  const query = `
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as new_followers,
      SUM(COUNT(*)) OVER (ORDER BY DATE(created_at)) as total_followers
    FROM user_follows
    WHERE following_id = :userId
      AND created_at >= NOW() - INTERVAL '${days} days'
    GROUP BY DATE(created_at)
    ORDER BY date
  `;

  const [results] = await sequelize.query(query, {
    replacements: { userId },
    type: sequelize.QueryTypes.SELECT,
  });

  return results;
};

Analytics.generateDailyStats = async (date = new Date()) => {
  const dateStr = date.toISOString().split("T")[0];

  // Get daily post count
  const [postStats] = await sequelize.query(
    `
    SELECT COUNT(*) as total_posts
    FROM posts 
    WHERE DATE(created_at) = :date
  `,
    {
      replacements: { date: dateStr },
      type: sequelize.QueryTypes.SELECT,
    }
  );

  // Get daily active users
  const [userStats] = await sequelize.query(
    `
    SELECT COUNT(DISTINCT user_id) as active_users
    FROM (
      SELECT user_id FROM posts WHERE DATE(created_at) = :date
      UNION
      SELECT user_id FROM user_likes WHERE DATE(liked_at) = :date
      UNION  
      SELECT user_id FROM user_retweets WHERE DATE(retweeted_at) = :date
    ) as active_users
  `,
    {
      replacements: { date: dateStr },
      type: sequelize.QueryTypes.SELECT,
    }
  );

  return {
    date: dateStr,
    totalPosts: postStats.total_posts,
    activeUsers: userStats.active_users,
  };
};

module.exports = {
  UserFollow,
  UserLike,
  UserRetweet,
  Analytics,
};
