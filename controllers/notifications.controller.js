const Notification = require("../models/Notification");
const moment = require("moment");

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
    const userId = req.user._id;
    const notifications = await Notification.find({ recipient: userId })
      .sort({ time: -1 })
      .limit(50);

    const formatted = notifications.map((n) => ({
      id: n._id.toString(),
      type: n.type,
      user: n.user,
      message: n.message,
      time: formatTime(n.time),
    }));

    res.json(formatted);
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get notifications",
      message: error.message,
    });
  }
};

module.exports = { getNotifications };
