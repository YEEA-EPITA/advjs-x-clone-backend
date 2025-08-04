const express = require("express");
const router = express.Router();
const { pollController } = require("../controllers");
const { validateSchemaMiddleware, authMiddleware } = require("../middlewares");
const { pollSchema } = require("../schemas");

/**
 * @swagger
 * /polls/vote:
 *   post:
 *     summary: Vote on a poll option
 *     tags: [Polls]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VotePollInput'
 *     responses:
 *       200:
 *         description: Vote recorded successfully
 *       403:
 *         description: Already voted
 *       500:
 *         description: Failed to record vote
 */
router.post(
  "/vote",
  authMiddleware,
  validateSchemaMiddleware({ body: pollSchema.votePollSchema }),
  pollController.votePoll
);

module.exports = router;
