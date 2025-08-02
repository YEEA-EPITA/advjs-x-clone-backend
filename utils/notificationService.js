const Notification = require("../models/Notification");

// Create a follow notification
function createFollowNotification({ actorUsername, recipientId }) {
  return Notification.create({
    type: "follow",
    user: actorUsername,
    message: `${actorUsername} followed you`,
    recipient: recipientId,
    meta: {},
  });
}

// Example: create a mention notification
function createMentionNotification({ actorUsername, recipientId, postId }) {
  return Notification.create({
    type: "mention",
    user: actorUsername,
    message: `${actorUsername} mentioned you in a post`,
    recipient: recipientId,
    meta: { postId },
  });
}

// Example: create an engagement notification (like, comment, etc.)
function createEngagementNotification({
  actorUsername,
  recipientId,
  postId,
  engagementType,
}) {
  return Notification.create({
    type: "engagement",
    user: actorUsername,
    message: `${actorUsername} ${engagementType} your post`,
    recipient: recipientId,
    meta: { postId, engagementType },
  });
}

module.exports = {
  createFollowNotification,
  createMentionNotification,
  createEngagementNotification,
};
