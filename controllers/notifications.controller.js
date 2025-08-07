const Notification = require("../models/PostgreSQLNotification");
const moment = require("moment");
const { ResponseFactory, ErrorFactory } = require("../factories");

// Time format time (e.g., "Just now", "3m", "1d" ...)
function formatTime(date) {
  const now = moment();
  const then = moment(date);
  const diffSeconds = now.diff(then, "seconds");
  if (diffSeconds < 60) return "Just now";
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h`;
  return `${Math.floor(diffSeconds / 86400)}d`;
}

// GET /api/notifications
const getNotifications = async (req, res) => {
  try {
    // Always use string for recipient_id
    const userId = req.user._id ? req.user._id.toString() : req.user.id;
    const notifications = await Notification.findAll({
      where: { actor_id: userId },
      where: { recipient_id: userId },
      order: [["created_at", "DESC"]],
      limit: 50,
    });

    const formatted = notifications.map((n) => ({
      id: n.id,
      type: n.type,
      actor_username: n.actor_username,
      actor_id: n.actor_id,
      recipient_id: n.recipient_id,
      message: n.message,
      post_id: n.post_id,
      is_read: n.is_read,
      time: formatTime(n.created_at),
    }));

    return ResponseFactory.success({
      res,
      message: "Notifications retrieved successfully",
      data: formatted,
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    return ErrorFactory.internalServerError({
      res,
      message: "Failed to get notifications",
      error: error.message,
    });
  }
};

module.exports = { getNotifications };
