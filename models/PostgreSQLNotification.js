const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/postgresql");

// PostgreSQL Notification model
const Notification = sequelize.define(
  "Notification",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    recipient_id: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "References MongoDB User._id or username",
    },
    actor_username: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Username of the user who triggered the notification",
    },
    type: {
      type: DataTypes.ENUM(
        "follow",
        "mention",
        "like",
        "comment",
        "retweet",
        "reply",
        "system"
      ),
      allowNull: false,
    },
    post_id: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Related post ID, if applicable",
    },
    message: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
  },
  {
    tableName: "notifications",
    indexes: [
      { fields: ["recipient_id"] },
      { fields: ["actor_username"] },
      { fields: ["type"] },
      { fields: ["created_at"] },
    ],
    timestamps: false,
  }
);

module.exports = Notification;
