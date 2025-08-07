const { Poll, PollOption, PollVote } = require("../models");
const { ErrorFactory } = require("../factories");
const { ResponseFactory } = require("../factories/responseFactory");

const { socketManager } = require("../utils");

const votePoll = async (req, res) => {
  try {
    const jwtUser = req.user;
    const { poll_id, option_id, post_id } = req.body;

    const existingVote = await PollVote.findOne({
      where: { poll_id, user_id: jwtUser._id.toString() },
    });

    if (existingVote) {
      return ErrorFactory.forbidden({
        res,
        message: "You have already voted in this poll.",
      });
    }

    await Poll.sequelize.transaction(async (t) => {
      await PollVote.create(
        {
          poll_id,
          user_id: jwtUser._id.toString(),
          option_id,
        },
        { transaction: t }
      );

      await PollOption.increment("vote_count", {
        by: 1,
        where: { id: option_id },
        transaction: t,
      });
    });

    // Get updated poll data
    const updatedPoll = await Poll.findByPk(poll_id, {
      include: [
        {
          model: PollOption,
          as: "PollOptions", // ✅ Match your association
          attributes: ["id", "option_text", "vote_count"],
        },
      ],
    });

    const userSpecificPoll = {
      id: updatedPoll.id,
      question: updatedPoll.question,
      expires_at: updatedPoll.expires_at,
      options: updatedPoll.PollOptions,
      voted: true,
      selected_option_id: option_id,
    };

    // For others (emit via socket)
    const globalPoll = {
      id: updatedPoll.id,
      question: updatedPoll.question,
      expires_at: updatedPoll.expires_at,
      options: updatedPoll.PollOptions,
      voted: false,
      selected_option_id: null,
    };

    // Emit to all other users (not the voter)
    socketManager.getIO().emit("pollUpdated", {
      post_id,
      poll: globalPoll,
    });

    // Return only to the voting user
    return ResponseFactory.success({
      res,
      statusCode: 200,
      message: "Vote recorded successfully",
      data: {
        post_id,
        poll: userSpecificPoll,
      },
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
