// NotificationService.js
// Centralized notification creation logic for all notification types

const Notification = require("../models/PostgreSQLNotification");
const User = require("../models/UserModels");

class NotificationService {
  // Create a notification for a comment
  static async createCommentNotification({ post, actor }) {
    if (post && post.user_id !== actor._id.toString()) {
      await Notification.create({
        recipient_id: post.user_id,
        actor_username: actor.username,
        type: "comment",
        post_id: post.id || post._id,
        message: `${actor.username} commented on your post`,
        is_read: false,
      });
    }
  }

  // Create a notification for a like
  static async createLikeNotification({ post, actor }) {
    if (post && post.user_id !== actor._id.toString()) {
      await Notification.create({
        recipient_id: post.user_id,
        actor_username: actor.username,
        type: "like",
        post_id: post.id || post._id,
        message: `${actor.username} liked your post`,
        is_read: false,
      });
    }
  }

  // Create a notification for a retweet
  static async createRetweetNotification({ post, actor }) {
    if (post && post.user_id !== actor._id.toString()) {
      await Notification.create({
        recipient_id: post.user_id,
        actor_username: actor.username,
        type: "retweet",
        post_id: post.id || post._id,
        message: `${actor.username} retweeted your post`,
        is_read: false,
      });
    }
  }

  // Create notifications for mentions (multiple users)
  static async createMentionNotifications({ mentionedUsernames, actor }) {
    if (!mentionedUsernames || mentionedUsernames.length === 0) return;
    for (const username of mentionedUsernames) {
      const mentionedUser = await User.findOne({ username });
      if (
        mentionedUser &&
        mentionedUser._id.toString() !== actor._id.toString()
      ) {
        await Notification.create({
          recipient_id: mentionedUser._id.toString(),
          actor_username: actor.username,
          type: "mention",
          post_id: null,
          message: `${actor.username} mentioned you in a post`,
          is_read: false,
        });
      }
    }
  }

  // Create a notification for a follow
  static async createFollowNotification({ followedUser, actor }) {
    if (followedUser && followedUser._id.toString() !== actor._id.toString()) {
      await Notification.create({
        recipient_id: followedUser._id.toString(),
        actor_username: actor.username,
        type: "follow",
        post_id: null,
        message: `${actor.username} followed you`,
        is_read: false,
      });
    }
  }
}

module.exports = NotificationService;
