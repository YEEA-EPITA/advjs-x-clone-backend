const { Poll, PollOption, PollVote } = require("../models");
const { ErrorFactory } = require("../factories");
const { ResponseFactory } = require("../factories/responseFactory");

const votePoll = async (req, res) => {
  try {
    const jwtUser = req.user;
    const { poll_id, option_id } = req.body;

    const existingVote = await PollVote.findOne({
      where: { poll_id, user_id: jwtUser._id.toString() },
    });

    if (existingVote)
      return ErrorFactory.forbidden({
        res,
        message: "You have already voted in this poll.",
      });

    await Poll.sequelize.transaction(async (t) => {
      await PollVote.create(
        { poll_id, user_id: jwtUser._id.toString(), option_id },
        { transaction: t }
      );

      await PollOption.increment("vote_count", {
        by: 1,
        where: { id: option_id },
        transaction: t,
      });
    });

    return ResponseFactory.success({
      res,
      statusCode: 200,
      message: "Vote recorded successfully",
    });
  } catch (err) {
    return ErrorFactory.internalServerError({
      res,
      message: "Failed to record vote",
      details: err.message,
    });
  }
};

const getPollByPost = async (req, res) => {
  try {
    const { postId } = req.params;

    const poll = await Poll.findOne({
      where: { post_id: postId },
      include: [{ model: PollOption }],
    });

    if (!poll) {
      return res.status(404).json({ error: "Poll not found" });
    }

    res.status(200).json(poll);
  } catch (err) {
    console.error("Error fetching poll:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  votePoll,
  getPollByPost,
};
