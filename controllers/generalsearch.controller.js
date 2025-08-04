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

    // USERS CURSOR PAGINATION
    let userQuery = {};
    if (userCursor) {
      userQuery._id = { $lt: userCursor };
    }

    // POSTS CURSOR PAGINATION
    let postFilters = { limit: limit + 1 };
    if (postCursor) {
      // postCursor format: created_at|id
      const [created_at, id] = postCursor.split("|");
      postFilters.cursor = { created_at, id };
    }

    if (!q.trim()) {
      // Return all users and all posts (with cursors)
      users = await User.find(userQuery)
        .select("_id username displayName profilePicture bio")
        .limit(limit + 1)
        .sort({ createdAt: -1 });
      if (users.length > limit) {
        nextUserCursor = users[limit]._id;
        users = users.slice(0, limit);
      }
      try {
        posts = await Post.searchPosts(null, postFilters);
        if (posts.length > limit) {
          const last = posts[limit];
          nextPostCursor = `${last.created_at.toISOString()}|${last.id}`;
          posts = posts.slice(0, limit);
        }
      } catch (err) {
        posts = [];
      }
    } else {
      // Search users (fuzzy)
      let usersRaw = [];
      let searchUserQuery = userQuery;
      try {
        searchUserQuery = { ...searchUserQuery, $text: { $search: q } };
        usersRaw = await User.find(searchUserQuery)
          .select("_id username displayName profilePicture bio score")
          .limit(limit + 1)
          .sort({ score: { $meta: "textScore" } });
      } catch (err) {
        searchUserQuery = {
          ...searchUserQuery,
          $or: [
            { username: { $regex: q, $options: "i" } },
            { displayName: { $regex: q, $options: "i" } },
          ],
        };
        usersRaw = await User.find(searchUserQuery)
          .select("_id username displayName profilePicture bio")
          .limit(limit + 1);
      }
      users = Array.isArray(usersRaw) ? usersRaw : usersRaw ? [usersRaw] : [];
      if (users.length > limit) {
        nextUserCursor = users[limit]._id;
        users = users.slice(0, limit);
      }
      if (!Array.isArray(users)) users = [];

      // Search posts (content and username)
      try {
        posts = await Post.searchPosts(q, postFilters);
        if (posts.length > limit) {
          const last = posts[limit];
          nextPostCursor = `${last.created_at.toISOString()}|${last.id}`;
          posts = posts.slice(0, limit);
        }
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
