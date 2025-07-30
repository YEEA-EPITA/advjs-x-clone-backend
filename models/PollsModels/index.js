const Poll = require("./Poll");
const PollOption = require("./PollOption");
const PollVote = require("./PollVote");

// 🧠 Relationships

// A Poll has many options
Poll.hasMany(PollOption, {
  foreignKey: "poll_id",
  onDelete: "CASCADE",
});
PollOption.belongsTo(Poll, {
  foreignKey: "poll_id",
});

// A Poll has many votes
Poll.hasMany(PollVote, {
  foreignKey: "poll_id",
  onDelete: "CASCADE",
});
PollVote.belongsTo(Poll, {
  foreignKey: "poll_id",
});

// An Option has many votes
PollOption.hasMany(PollVote, {
  foreignKey: "option_id",
  onDelete: "CASCADE",
});
PollVote.belongsTo(PollOption, {
  foreignKey: "option_id",
});

// ✅ Export all models
module.exports = {
  Poll,
  PollOption,
  PollVote,
};
