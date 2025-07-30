const authMiddleware = require("./authMiddleware");
const validateSchemaMiddleware = require("./validateSchemaMiddleware");
const uploadMiddleware = require("./uploadMiddleware");

module.exports = {
  authMiddleware,
  validateSchemaMiddleware,
  uploadMiddleware,
};
