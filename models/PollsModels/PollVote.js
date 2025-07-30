const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/postgresql");

const PollVote = sequelize.define(
  "PollVote",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    poll_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.STRING,
      allowNull: false, // MongoDB User._id
    },
    option_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "poll_votes",
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ["poll_id", "user_id"], // Prevent multiple votes
      },
    ],
  }
);

module.exports = PollVote;
