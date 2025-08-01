const User = require("../models/UserModels");
const Post = require("../models/PostgreSQLPost");

// General search: search users and posts by keyword
const generalsearch = async (req, res) => {
  try {
    const q = req.query.q || req.query.searchTerm || "";
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    if (!q.trim()) {
      return res
        .status(400)
        .json({ success: false, error: "Missing search query" });
    }

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
    let users = Array.isArray(usersRaw) ? usersRaw : usersRaw ? [usersRaw] : [];
    if (!Array.isArray(users)) users = [];

    // Search posts (content and username)
    let posts = [];
    try {
      posts = await Post.searchPosts(q, { limit });
    } catch (err) {
      posts = [];
    }

    res.json({
      success: true,
      message: "General search completed successfully",
      users,
      posts,
      usersCount: users.length,
      postsCount: posts.length,
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
