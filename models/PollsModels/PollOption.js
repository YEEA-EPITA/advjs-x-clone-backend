const { DataTypes } = require("sequelize");
const { sequelize } = require("../../config/postgresql");

const PollOption = sequelize.define(
  "PollOption",
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
    option_text: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    vote_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    tableName: "poll_options",
    timestamps: false,
  }
);

module.exports = PollOption;
