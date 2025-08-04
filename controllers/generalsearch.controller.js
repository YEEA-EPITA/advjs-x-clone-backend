const User = require("../models/UserModels");
const Post = require("../models/PostgreSQLPost");

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
      let postWhere = "p.is_public = true";
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

    res.json({
      success: true,
      message: "General search completed successfully",
      users,
      posts,
      usersCount: users.length,
      postsCount: posts.length,
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
