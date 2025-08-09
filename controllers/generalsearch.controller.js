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
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    let users = [];
    let posts = [];
    let usersCount = 0;
    let postsCount = 0;

    if (!q.trim()) {
      // No search query: return all users and posts with offset pagination
      usersCount = await User.countDocuments();
      users = await User.find({})
        .select("_id username displayName profilePicture bio")
        .sort({ _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit);

      postsCount = await Post.sequelize.query(
        "SELECT COUNT(*) as count FROM posts p WHERE p.is_public = true AND p.is_deleted = false",
        { type: Post.sequelize.QueryTypes.SELECT }
      );
      postsCount = postsCount[0]?.count ? parseInt(postsCount[0].count) : 0;

      const postQuery = `
        SELECT p.* FROM posts p
        WHERE p.is_public = true AND p.is_deleted = false
        ORDER BY p.created_at DESC, p.id DESC
        LIMIT :limit OFFSET :offset
      `;
      const postResults = await Post.sequelize.query(postQuery, {
        replacements: { limit, offset: (page - 1) * limit },
        type: Post.sequelize.QueryTypes.SELECT,
      });
      posts = postResults;
    } else {
      // Search users (fuzzy)
      let usersRaw = [];
      try {
        usersCount = await User.countDocuments({ $text: { $search: q } });
        usersRaw = await User.find({ $text: { $search: q } })
          .select("_id username displayName profilePicture bio score")
          .sort({ score: { $meta: "textScore" }, _id: 1 })
          .skip((page - 1) * limit)
          .limit(limit);
      } catch (err) {
        usersCount = await User.countDocuments({
          $or: [
            { username: { $regex: q, $options: "i" } },
            { displayName: { $regex: q, $options: "i" } },
          ],
        });
        usersRaw = await User.find({
          $or: [
            { username: { $regex: q, $options: "i" } },
            { displayName: { $regex: q, $options: "i" } },
          ],
        })
          .select("_id username displayName profilePicture bio")
          .skip((page - 1) * limit)
          .limit(limit);
      }
      users = Array.isArray(usersRaw) ? usersRaw : usersRaw ? [usersRaw] : [];
      if (!Array.isArray(users)) users = [];

      // Search posts (content and username)
      try {
        // You may want to implement offset pagination for posts search as well
        posts = await Post.searchPosts(q, {
          limit,
          offset: (page - 1) * limit,
        });
        postsCount = posts.length;
      } catch (err) {
        posts = [];
        postsCount = 0;
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
      usersCount,
      postsCount,
      page,
      limit,
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
