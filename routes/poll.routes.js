const express = require("express");
const router = express.Router();
const { pollController } = require("../controllers");
const { validateSchemaMiddleware, authMiddleware } = require("../middlewares");
const { pollSchema } = require("../schemas");

// Vote on a poll option
router.post(
  "/vote",
  authMiddleware,
  validateSchemaMiddleware({ body: pollSchema.votePollSchema }),
  pollController.votePoll
);

module.exports = router;
