const UserModels = require("./UserModels");
const PollsModels = require("./PollsModels");
const PostsModels = require("./PostgreSQLPost");
const CommentsModels = require("./Comment");
const GeneralModels = require("./PostgreSQLModels");

module.exports = {
  UserModels,
  ...PollsModels,
  ...PostsModels,
  ...CommentsModels,
  ...GeneralModels,
  // Add other models here as needed
};
