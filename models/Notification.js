const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["mention", "system", "engagement", "follow", "other"],
      required: true,
    },
    user: {
      type: String, // username of the user who triggered the notification
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    time: {
      type: Date,
      default: Date.now,
    },
    meta: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Notification", notificationSchema);
