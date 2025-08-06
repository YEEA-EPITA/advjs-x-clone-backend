const User = require("../models/UserModels");
const Post = require("../models/PostgreSQLPost");
const {
  UserFollow,
  UserLike,
  UserRetweet,
  Poll,
  PollOption,
} = require("../models");

// General search: search users and posts by keyword
const generalsearch = async (req, res) => {
  try {
    const q = req.query.q || req.query.searchTerm || "";
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const userCursor = req.query.userCursor || null;
    const postCursor = req.query.postCursor || null;
    let users = [];
    let posts = [];
    let nextUserCursor = null;
    let nextPostCursor = null;

    if (!q.trim()) {
      // No search query: return all users and posts with cursor-based pagination
      // Users: use _id for cursor
      const userQuery = {};
      if (userCursor) {
        userQuery._id = { $gt: userCursor };
      }
      users = await User.find(userQuery)
        .select("_id username displayName profilePicture bio")
        .sort({ _id: 1 })
        .limit(limit + 1);
      if (users.length > limit) {
        nextUserCursor = users[limit]._id;
        users = users.slice(0, limit);
      }

      // Posts: use created_at + id for cursor
      let postFilters = { is_public: true };
      let postWhere = "p.is_public = true AND p.is_deleted = false";
      let postReplacements = {};
      if (postCursor) {
        // postCursor format: created_at|id
        const [createdAt, id] = postCursor.split("|");
        postWhere +=
          " AND (p.created_at < :createdAt OR (p.created_at = :createdAt AND p.id < :id))";
        postReplacements.createdAt = createdAt;
        postReplacements.id = id;
      }
      const postQuery = `
        SELECT p.* FROM posts p
        WHERE ${postWhere}
        ORDER BY p.created_at DESC, p.id DESC
        LIMIT :limit
      `;
      postReplacements.limit = limit + 1;
      const postResults = await Post.sequelize.query(postQuery, {
        replacements: postReplacements,
        type: Post.sequelize.QueryTypes.SELECT,
      });
      posts = postResults;
      if (posts.length > limit) {
        const last = posts[limit];
        nextPostCursor = `${last.created_at.toISOString()}|${last.id}`;
        posts = posts.slice(0, limit);
      }
    } else {
      // Search users (fuzzy)
      let usersRaw = [];
      try {
        usersRaw = await User.find({ $text: { $search: q } })
          .select("_id username displayName profilePicture bio score")
          .limit(limit)
          .sort({ score: { $meta: "textScore" } });
      } catch (err) {
        usersRaw = await User.find({
          $or: [
            { username: { $regex: q, $options: "i" } },
            { displayName: { $regex: q, $options: "i" } },
          ],
        })
          .select("_id username displayName profilePicture bio")
          .limit(limit);
      }
      users = Array.isArray(usersRaw) ? usersRaw : usersRaw ? [usersRaw] : [];
      if (!Array.isArray(users)) users = [];

      // Search posts (content and username)
      try {
        posts = await Post.searchPosts(q, { limit });
      } catch (err) {
        posts = [];
      }
    }

    // Get current user ID for checking interactions
    const currentUserId = req.user?._id?.toString() || null;

    // Enhance users with follow status
    let enhancedUsers = [];
    if (users.length > 0 && currentUserId) {
      // Get current user's following list from MongoDB
      const currentUser = await User.findById(currentUserId).select(
        "following"
      );
      const followingIds = new Set(
        currentUser?.following?.map((id) => id.toString()) || []
      );

      enhancedUsers = users.map((user) => ({
        ...user.toObject(),
        isFollowing: followingIds.has(user._id.toString()),
      }));
    } else {
      enhancedUsers = users.map((user) => ({
        ...user.toObject(),
        isFollowing: false,
      }));
    }

    // Enhance posts with interaction status and polls
    let enhancedPosts = [];
    if (posts.length > 0) {
      const postIds = posts.map((post) => post.id);

      // Get like status
      let likeRelations = [];
      let retweetRelations = [];
      if (currentUserId) {
        likeRelations = await UserLike.findAll({
          where: {
            user_id: currentUserId,
            post_id: postIds,
          },
        });

        retweetRelations = await UserRetweet.findAll({
          where: {
            user_id: currentUserId,
            post_id: postIds,
          },
        });
      }

      const likedPostIds = new Set(likeRelations.map((rel) => rel.post_id));
      const retweetedPostIds = new Set(
        retweetRelations.map((rel) => rel.post_id)
      );

      // Get polls for posts
      const polls = await Poll.findAll({
        where: { post_id: postIds },
        include: [
          {
            model: PollOption,
            as: "PollOptions",
          },
        ],
      });

      const pollsByPostId = {};
      polls.forEach((poll) => {
        pollsByPostId[poll.post_id] = {
          id: poll.id,
          question: poll.question,
          expires_at: poll.expires_at,
          created_at: poll.created_at,
          options: poll.PollOptions.map((option) => ({
            id: option.id,
            option_text: option.option_text,
            vote_count: option.vote_count || 0,
          })),
        };
      });

      enhancedPosts = posts.map((post) => ({
        ...post,
        isLiked: likedPostIds.has(post.id),
        isRetweeted: retweetedPostIds.has(post.id),
        poll: pollsByPostId[post.id] || null,
      }));
    }

    res.json({
      success: true,
      message: "General search completed successfully",
      users: enhancedUsers,
      posts: enhancedPosts,
      usersCount: enhancedUsers.length,
      postsCount: enhancedPosts.length,
      nextUserCursor,
      nextPostCursor,
    });
  } catch (error) {
    console.error("General search error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to perform general search",
      message: error.message,
    });
  }
};

module.exports = { generalsearch };
