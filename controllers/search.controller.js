const User = require("../models/UserModels");

// Search users by username or displayName (case-insensitive, partial match)
const searchUsers = async (req, res) => {
  try {
    const q = req.query.q || req.query.searchTerm || "";
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);

    // Try fuzzy search using MongoDB text index if available
    let usersRaw = [];
    // ...existing code...
    if (q.trim().length > 0) {
      // If text index exists, use $text for fuzzy search
      try {
        usersRaw = await User.find({ $text: { $search: q } })
          .select("_id username displayName profilePicture bio score")
          .limit(limit)
          .sort({ score: { $meta: "textScore" } });
        // ...existing code...
      } catch (err) {
        // Fallback to regex if $text fails
        usersRaw = await User.find({
          $or: [
            { username: { $regex: q, $options: "i" } },
            { displayName: { $regex: q, $options: "i" } },
          ],
        })
          .select("_id username displayName profilePicture bio")
          .limit(limit);
        // ...existing code...
      }
    }
    let users = [];
    if (Array.isArray(usersRaw)) {
      users = usersRaw;
    } else if (usersRaw) {
      users = [usersRaw];
    }

    // Defensive: ensure users is always an array
    if (!Array.isArray(users)) users = [];

    res.json({
      success: true,
      message: "User fuzzy search completed successfully",
      users,
      resultsCount: users.length,
    });
  } catch (error) {
    console.error("User search error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to perform user search",
      message: error.message,
    });
  }
};

module.exports = { searchUsers };
