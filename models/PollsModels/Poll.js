const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/postgresql");

const Poll = sequelize.define(
  "Poll",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    post_id: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: "Link to the post this poll belongs to",
    },
    question: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "polls",
    timestamps: false,
  }
);

module.exports = Poll;
